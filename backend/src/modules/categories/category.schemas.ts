import { z } from "zod";
import { SLUG_PATTERN } from "./category.model.js";

export const categorySlug = z.string().trim().toLowerCase().max(60).regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes");

const editable = {
  name: z.string().trim().min(2).max(60),
  longName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  icon: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use a lucide icon name, e.g. fuel"),
  emoji: z.string().trim().max(8),
  order: z.number().int().min(0).max(10_000),
  active: z.boolean(),
  showInMenu: z.boolean(),
};

export const createCategoryBody = z.object({ slug: categorySlug, ...editable }).partial({
  description: true,
  icon: true,
  emoji: true,
  order: true,
  active: true,
  showInMenu: true,
});

export const updateCategoryBody = z
  .object(editable)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const slugParams = z.object({ slug: categorySlug });
export const reorderBody = z.object({ slugs: z.array(categorySlug).min(1).max(200) });
export const adminListQuery = z.object({ active: z.enum(["true", "false"]).optional() });
