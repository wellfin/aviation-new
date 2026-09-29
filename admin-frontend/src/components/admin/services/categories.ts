"use client";

import { z } from "zod";
import { useApi } from "@/lib/hooks/useApi";

/** A service category as returned by GET /admin/categories. */
export interface AdminCategory {
  slug: string;
  name: string;
  longName: string;
  description: string;
  icon: string;
  emoji: string;
  order: number;
  active: boolean;
  showInMenu: boolean;
  providerCount: number;
}

/** Loads the whole catalogue (active and inactive) in display order. */
export function useCategories() {
  const res = useApi<AdminCategory[]>("/admin/categories");
  const names: Record<string, string> = Object.fromEntries((res.data ?? []).map((c) => [c.slug, c.name]));
  return { ...res, categories: res.data ?? [], names };
}

/** Mirrors backend/src/modules/categories/category.schemas.ts. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  slug: z.string().trim().toLowerCase().max(60, "At most 60 characters").regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60, "At most 60 characters"),
  longName: z.string().trim().min(2, "Enter at least 2 characters").max(100, "At most 100 characters"),
  description: z.string().trim().max(500, "At most 500 characters"),
  icon: z
    .string()
    .trim()
    .max(40, "At most 40 characters")
    .regex(/^[a-z0-9-]+$/, "Use a lucide icon name, e.g. fuel"),
  emoji: z.string().trim().max(8, "At most 8 characters"),
  order: z.number({ error: "Enter a number" }).int("Enter a whole number").min(0, "Minimum 0").max(10_000, "Maximum 10000"),
  active: z.boolean(),
  showInMenu: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
