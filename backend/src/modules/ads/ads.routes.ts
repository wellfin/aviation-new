import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { adminAdsQuery, createAdBody, idParams, serveQuery, trafficQuery, updateAdBody } from "./ads.schemas.js";
import * as ads from "./ads.service.js";

/** Public: mounted at /ads */
export const adsRouter = Router();

adsRouter.get(
  "/serve",
  handler({ query: serveQuery }, async ({ query }, _req, res) => {
    res.setHeader("Cache-Control", "no-store");
    ok(res, await ads.serveAd(query.placement));
  }),
);

adsRouter.get(
  "/:id/click",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    const target = await ads.registerClick(params.id);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, target);
  }),
);

/** Admin: mounted at /admin/ads */
export const adminAdsRouter = Router();
adminAdsRouter.use(requirePermission("ads:manage"));

adminAdsRouter.get(
  "/",
  handler({ query: adminAdsQuery }, async ({ query }, _req, res) => {
    ok(res, await ads.listAdminAds(query));
  }),
);

adminAdsRouter.get("/stats", async (_req, res) => {
  ok(res, await ads.adStats());
});

/** Current traffic split per placement: each live ad's weight, share % and delivered impressions. */
adminAdsRouter.get(
  "/traffic",
  handler({ query: trafficQuery }, async ({ query }, _req, res) => {
    ok(res, await ads.trafficShares(query.placement));
  }),
);

adminAdsRouter.post(
  "/",
  handler({ body: createAdBody }, async ({ body }, _req, res) => {
    created(res, await ads.createAd(body));
  }),
);

adminAdsRouter.get(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await ads.getAdminAd(params.id));
  }),
);

adminAdsRouter.patch(
  "/:id",
  handler({ params: idParams, body: updateAdBody }, async ({ params, body }, _req, res) => {
    ok(res, await ads.updateAd(params.id, body));
  }),
);

adminAdsRouter.delete(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await ads.deleteAd(params.id);
    noContent(res);
  }),
);
