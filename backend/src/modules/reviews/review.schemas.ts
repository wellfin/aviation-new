import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { REVIEW_STATUSES } from "./review.model.js";

export const slugParams = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid provider"),
});

export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

/** Mirrors the frontend `reviewSchema` (provider-profile/schema.ts) plus the optional author job title. */
export const createReviewBody = z.object({
  rating: z.coerce.number().int("Please choose a rating").min(1, "Please choose a rating").max(5, "Please choose a rating"),
  title: z.string().trim().min(3, "Please add a short title").max(120),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
  role: z.string().trim().max(120).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewBody>;

export const listQuery = paginationQuery;

export const adminListQuery = paginationQuery.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  /** Provider id or slug. */
  provider: z.string().trim().max(120).optional(),
  q: z.string().trim().max(100).optional(),
});
export type AdminListQuery = z.infer<typeof adminListQuery>;

export const rejectBody = z.object({ note: z.string().trim().max(500).optional() });
