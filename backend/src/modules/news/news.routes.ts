import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { adminNewsQuery, createNewsBody, idParams, newsCategoryBody, newsCategoryOrderBody, publicNewsQuery, slugParams, updateNewsBody } from "./news.schemas.js";
import * as categories from "./news-category.service.js";
import * as news from "./news.service.js";

/** Public: mounted at /news */
export const newsRouter = Router();

newsRouter.get(
  "/",
  handler({ query: publicNewsQuery }, async ({ query }, _req, res) => {
    ok(res, await news.listPublishedNews(query));
  }),
);

/** Category names in display order (news page tabs). Declared before /:slug. */
newsRouter.get(
  "/categories",
  handler({}, async (_input, _req, res) => {
    ok(res, await categories.listNewsCategoryNames());
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

/* Categories (declared before /:id). */
adminNewsRouter.get(
  "/categories",
  handler({}, async (_input, _req, res) => {
    ok(res, await categories.listAdminNewsCategories());
  }),
);

adminNewsRouter.post(
  "/categories",
  handler({ body: newsCategoryBody }, async ({ body }, _req, res) => {
    created(res, await categories.createNewsCategory(body.name));
  }),
);

adminNewsRouter.put(
  "/categories/order",
  handler({ body: newsCategoryOrderBody }, async ({ body }, _req, res) => {
    ok(res, await categories.reorderNewsCategories(body.ids));
  }),
);

adminNewsRouter.patch(
  "/categories/:id",
  handler({ params: idParams, body: newsCategoryBody }, async ({ params, body }, _req, res) => {
    ok(res, await categories.renameNewsCategory(params.id, body.name));
  }),
);

adminNewsRouter.delete(
  "/categories/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await categories.deleteNewsCategory(params.id);
    noContent(res);
  }),
);

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
