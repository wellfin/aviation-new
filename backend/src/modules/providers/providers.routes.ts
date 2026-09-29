import { Router } from "express";
import { currentUser, requirePermission, requireVerifiedEmail } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import * as admin from "./admin-providers.service.js";
import * as listing from "./listing.service.js";
import {
  adminCreateBody,
  adminListQuery,
  adminUpdateBody,
  createListingBody,
  idParams,
  listProvidersQuery,
  rejectBody,
  relatedQuery,
  slugParams,
  updateListingBody,
} from "./providers.schemas.js";
import * as providers from "./providers.service.js";

/** Public directory: /providers (published listings only). */
export const providersRouter = Router();

providersRouter.get(
  "/",
  handler({ query: listProvidersQuery }, async ({ query }, _req, res) => ok(res, await providers.listPublishedProviders(query))),
);

providersRouter.get(
  "/:slug",
  handler({ params: slugParams }, async ({ params }, _req, res) => ok(res, await providers.getPublishedProvider(params.slug))),
);

providersRouter.get(
  "/:slug/related",
  handler({ params: slugParams, query: relatedQuery }, async ({ params, query }, _req, res) =>
    ok(res, await providers.relatedProviders(params.slug, query.limit)),
  ),
);

/** The signed-in provider's own listing: /me/listing */
export const myListingRouter = Router();
myListingRouter.use(requirePermission("listing:manage:own"), requireVerifiedEmail);

myListingRouter.get(
  "/",
  handler({}, async (_input, req, res) => ok(res, await listing.getMyListing(currentUser(req)))),
);

myListingRouter.post(
  "/",
  handler({ body: createListingBody }, async ({ body }, req, res) => created(res, await listing.createMyListing(currentUser(req), body))),
);

myListingRouter.patch(
  "/",
  handler({ body: updateListingBody }, async ({ body }, req, res) => ok(res, await listing.updateMyListing(currentUser(req), body))),
);

myListingRouter.post(
  "/submit",
  handler({}, async (_input, req, res) => ok(res, await listing.submitMyListing(currentUser(req)))),
);

/** Listing administration: /admin/providers */
export const adminProvidersRouter = Router();
adminProvidersRouter.use(requirePermission("providers:manage"));

adminProvidersRouter.get(
  "/",
  handler({ query: adminListQuery }, async ({ query }, _req, res) => ok(res, await admin.adminListProviders(query))),
);

adminProvidersRouter.post(
  "/",
  handler({ body: adminCreateBody }, async ({ body }, _req, res) => created(res, await admin.adminCreateProvider(body))),
);

adminProvidersRouter.get(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => ok(res, await admin.adminGetProvider(params.id))),
);

adminProvidersRouter.patch(
  "/:id",
  handler({ params: idParams, body: adminUpdateBody }, async ({ params, body }, _req, res) =>
    ok(res, await admin.adminUpdateProvider(params.id, body)),
  ),
);

for (const action of ["approve", "suspend", "unpublish"] as const) {
  adminProvidersRouter.post(
    `/:id/${action}`,
    handler({ params: idParams }, async ({ params }, _req, res) => ok(res, await admin.transitionProvider(params.id, action))),
  );
}

adminProvidersRouter.post(
  "/:id/reject",
  handler({ params: idParams, body: rejectBody }, async ({ params, body }, _req, res) =>
    ok(res, await admin.transitionProvider(params.id, "reject", body.reason)),
  ),
);

adminProvidersRouter.delete(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await admin.adminDeleteProvider(params.id);
    noContent(res);
  }),
);
