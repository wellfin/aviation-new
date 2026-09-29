import { Router } from "express";
import { handler, created, noContent, ok } from "../../lib/http.js";
import { currentUser, requirePermission, requireVerifiedEmail } from "../../middleware/auth.js";
import { adminListQuery, createReviewBody, idParams, listQuery, rejectBody, slugParams } from "./review.schemas.js";
import {
  adminListReviews,
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
