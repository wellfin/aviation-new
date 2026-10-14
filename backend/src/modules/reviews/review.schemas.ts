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

const guestEmail = z.string().trim().toLowerCase().min(1, "Email is required").pipe(z.email("Enter a valid email address")).pipe(z.string().max(254));

/** "Share Your Experience" from a visitor (no account): the email is proven with a code first. */
export const guestReviewBody = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: guestEmail,
  company: z.string().trim().max(120).optional(),
  rating: z.coerce.number().int("Please choose a rating").min(1, "Please choose a rating").max(5, "Please choose a rating"),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
  /** Honeypot: real visitors never fill it. */
  website: z.string().max(200).optional(),
});
export type GuestReviewInput = z.infer<typeof guestReviewBody>;

export const reviewOtpRequestBody = z.object({ email: guestEmail });
export const reviewOtpVerifyBody = z.object({ email: guestEmail, code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code") });

export const listQuery = paginationQuery;

export const adminListQuery = paginationQuery.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  /** Provider id or slug. */
  provider: z.string().trim().max(120).optional(),
  q: z.string().trim().max(100).optional(),
});
export type AdminListQuery = z.infer<typeof adminListQuery>;

export const rejectBody = z.object({ note: z.string().trim().max(500).optional() });
