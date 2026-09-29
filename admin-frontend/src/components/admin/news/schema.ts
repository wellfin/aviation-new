import { z } from "zod";

export const NEWS_CATEGORIES = ["Industry News", "FBO Network", "Regulatory", "Fuel", "Technology", "Business Aviation"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export type NewsStatus = "draft" | "published";

export interface AdminNews {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  image: string;
  author: string;
  authorRole: string;
  readMinutes: number;
  featured: boolean;
  body: string[];
  status: NewsStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Same rule as the API's `imageRef`: a site path (not protocol-relative) or an absolute http(s) URL. */
export const imageRef = z
  .string()
  .trim()
  .min(1, "Image is required")
  .max(500, "Use at most 500 characters")
  .refine((v) => (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) || /^https?:\/\/[^\s]+$/i.test(v), "Use a site path (/…) or an http(s) URL");

/** Mirrors the backend `createNewsBody` / `updateNewsBody` field rules. */
export const newsFormSchema = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters").max(200, "Use at most 200 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "Use at most 120 characters")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "Use lowercase letters, numbers and hyphens"),
  excerpt: z.string().trim().min(10, "Use at least 10 characters").max(500, "Use at most 500 characters"),
  category: z.enum(NEWS_CATEGORIES, "Choose a category"),
  image: imageRef,
  body: z
    .array(z.string().trim().min(1, "Paragraphs can't be empty").max(10_000, "Paragraphs can be at most 10,000 characters"))
    .min(1, "Add at least one paragraph")
    .max(100, "At most 100 paragraphs"),
  author: z.string().trim().min(2, "Use at least 2 characters").max(120, "Use at most 120 characters"),
  authorRole: z.string().trim().max(120, "Use at most 120 characters"),
  featured: z.boolean(),
});

export type NewsFormValues = z.input<typeof newsFormSchema>;
