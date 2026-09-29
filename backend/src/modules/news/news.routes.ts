import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { adminNewsQuery, createNewsBody, idParams, publicNewsQuery, slugParams, updateNewsBody } from "./news.schemas.js";
import * as news from "./news.service.js";

/** Public: mounted at /news */
export const newsRouter = Router();

newsRouter.get(
  "/",
  handler({ query: publicNewsQuery }, async ({ query }, _req, res) => {
    ok(res, await news.listPublishedNews(query));
  }),
);

newsRouter.get(
  "/:slug",
  handler({ params: slugParams }, async ({ params }, _req, res) => {
    ok(res, await news.getPublishedNews(params.slug));
  }),
);

/** Admin: mounted at /admin/news */
export const adminNewsRouter = Router();
adminNewsRouter.use(requirePermission("content:manage"));

adminNewsRouter.get(
  "/",
  handler({ query: adminNewsQuery }, async ({ query }, _req, res) => {
    ok(res, await news.listAdminNews(query));
  }),
);

adminNewsRouter.post(
  "/",
  handler({ body: createNewsBody }, async ({ body }, _req, res) => {
    created(res, await news.createNews(body));
  }),
);

adminNewsRouter.get(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await news.getAdminNews(params.id));
  }),
);

adminNewsRouter.patch(
  "/:id",
  handler({ params: idParams, body: updateNewsBody }, async ({ params, body }, _req, res) => {
    ok(res, await news.updateNews(params.id, body));
  }),
);

adminNewsRouter.post(
  "/:id/publish",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await news.setNewsStatus(params.id, "published"));
  }),
);

adminNewsRouter.post(
  "/:id/unpublish",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await news.setNewsStatus(params.id, "draft"));
  }),
);

adminNewsRouter.delete(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await news.deleteNews(params.id);
    noContent(res);
  }),
);
