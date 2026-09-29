import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { NEWS_CATEGORIES, NEWS_STATUSES } from "./news.model.js";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });
export const slugParams = z.object({ slug: z.string().trim().toLowerCase().max(120).regex(SLUG_PATTERN, "Invalid slug") });

export const publicNewsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.union([z.enum(NEWS_CATEGORIES), z.literal("all")]).default("all"),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
});

export const adminNewsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.enum(NEWS_CATEGORIES).optional(),
  status: z.enum(NEWS_STATUSES).optional(),
});

/** Site-relative path (not protocol-relative) or an absolute http(s) URL. */
export const imageRef = z
  .string()
  .trim()
  .min(1, "Image is required")
  .max(500)
  .refine((v) => (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) || /^https?:\/\/[^\s]+$/i.test(v), "Use a site path (/…) or an http(s) URL");

const newsFields = {
  slug: z.string().trim().toLowerCase().max(120).regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().min(10).max(500),
  category: z.enum(NEWS_CATEGORIES),
  image: imageRef,
  body: z.array(z.string().trim().min(1).max(10_000)).min(1, "Add at least one paragraph").max(100),
  author: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(120).default(""),
  featured: z.boolean().default(false),
  publishedAt: z.iso.datetime({ offset: true }).optional(),
};

export const createNewsBody = z.object({
  ...newsFields,
  slug: newsFields.slug.optional(),
  status: z.enum(NEWS_STATUSES).default("draft"),
});

export const updateNewsBody = z
  .object({
    slug: newsFields.slug,
    title: newsFields.title,
    excerpt: newsFields.excerpt,
    category: newsFields.category,
    image: newsFields.image,
    body: newsFields.body,
    author: newsFields.author,
    authorRole: z.string().trim().max(120),
    featured: z.boolean(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export type CreateNewsInput = z.infer<typeof createNewsBody>;
export type UpdateNewsInput = z.infer<typeof updateNewsBody>;
export type PublicNewsQuery = z.infer<typeof publicNewsQuery>;
export type AdminNewsQuery = z.infer<typeof adminNewsQuery>;
