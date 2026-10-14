import { Router } from "express";
import multer from "multer";
import { formRateLimit, otpRateLimit } from "../../middleware/security.js";
import { sendLeadOtp, verifyLeadOtp } from "../leads/leads.service.js";
import { maxBytesFor } from "../uploads/uploads.service.js";
import { handler, created, noContent, ok } from "../../lib/http.js";
import { currentUser, requirePermission, requireVerifiedEmail } from "../../middleware/auth.js";
import { adminListQuery, createReviewBody, guestReviewBody, idParams, listQuery, rejectBody, reviewOtpRequestBody, reviewOtpVerifyBody, slugParams } from "./review.schemas.js";
import {
  adminListReviews,
  createGuestReview,
  createReview,
  deleteAnyReview,
  deleteOwnReview,
  listApprovedReviews,
  listOwnReviews,
  moderateReview,
} from "./review.service.js";

/** Mounted at /providers — owns only the /:slug/reviews paths. */
export const providerReviewsRouter = Router();

providerReviewsRouter.get(
  "/:slug/reviews",
  handler({ params: slugParams, query: listQuery }, async ({ params, query }, _req, res) => {
    ok(res, await listApprovedReviews(params.slug, query.page, query.pageSize));
  }),
);

providerReviewsRouter.post(
  "/:slug/reviews",
  requirePermission("reviews:create"),
  requireVerifiedEmail,
  handler({ params: slugParams, body: createReviewBody }, async ({ params, body }, req, res) => {
    created(res, await createReview(params.slug, currentUser(req), body));
  }),
);

/** Optional reviewer photo, buffered in memory (bounded) so its magic bytes are checked before storing. */
const testimonialPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytesFor("image"), files: 1, fields: 10, fieldSize: 4000, parts: 12 },
}).single("photo");

providerReviewsRouter.post(
  "/:slug/reviews/email-otp",
  otpRateLimit,
  handler({ params: slugParams, body: reviewOtpRequestBody }, async ({ body }, _req, res) => {
    await sendLeadOtp("review", body.email);
    ok(res, { sent: true });
  }),
);

providerReviewsRouter.post(
  "/:slug/reviews/email-otp/verify",
  otpRateLimit,
  handler({ params: slugParams, body: reviewOtpVerifyBody }, async ({ body }, _req, res) => {
    await verifyLeadOtp("review", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Guest "Share Your Experience" (multipart: fields + optional `photo`). */
providerReviewsRouter.post(
  "/:slug/testimonials",
  formRateLimit,
  testimonialPhoto,
  handler({ params: slugParams, body: guestReviewBody }, async ({ params, body }, req, res) => {
    // Bots fill the hidden field; answer as if accepted.
    if (body.website?.trim()) return created(res, { status: "pending" });
    created(res, await createGuestReview(params.slug, body, req.file));
  }),
);

/** Mounted at /me/reviews. */
export const myReviewsRouter = Router();

myReviewsRouter.get(
  "/",
  requirePermission("reviews:create"),
  handler({ query: listQuery }, async ({ query }, req, res) => {
    ok(res, await listOwnReviews(currentUser(req), query.page, query.pageSize));
  }),
);

myReviewsRouter.delete(
  "/:id",
  requirePermission("reviews:create"),
  handler({ params: idParams }, async ({ params }, req, res) => {
    await deleteOwnReview(currentUser(req), params.id);
    noContent(res);
  }),
);

/** Mounted at /admin/reviews. */
export const adminReviewsRouter = Router();

adminReviewsRouter.get(
  "/",
  requirePermission("reviews:moderate"),
  handler({ query: adminListQuery }, async ({ query }, _req, res) => {
    ok(res, await adminListReviews(query));
  }),
);

adminReviewsRouter.post(
  "/:id/approve",
  requirePermission("reviews:moderate"),
  handler({ params: idParams }, async ({ params }, req, res) => {
    ok(res, await moderateReview(params.id, currentUser(req), "approved"));
  }),
);

adminReviewsRouter.post(
  "/:id/reject",
  requirePermission("reviews:moderate"),
  handler({ params: idParams, body: rejectBody }, async ({ params, body }, req, res) => {
    ok(res, await moderateReview(params.id, currentUser(req), "rejected", body.note));
  }),
);

adminReviewsRouter.delete(
  "/:id",
  requirePermission("reviews:moderate"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await deleteAnyReview(params.id);
    noContent(res);
  }),
);
