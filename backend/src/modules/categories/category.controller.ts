import type { Request, Response } from "express";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { adminListQuery, createCategoryBody, reorderBody, slugParams, updateCategoryBody } from "./category.schemas.js";
import * as categories from "./category.service.js";

/**
 * HTTP layer for service categories: validates input (via `handler`), calls the
 * service and shapes the response. No business logic lives here.
 */

/** GET /categories — active categories in display order. */
export async function listPublic(_req: Request, res: Response): Promise<void> {
  ok(res, await categories.listPublicCategories());
}

/** GET /admin/categories?active= */
export const listAll = handler({ query: adminListQuery }, async ({ query }, _req, res) => {
  ok(res, await categories.listAllCategories(query.active === undefined ? undefined : query.active === "true"));
});

/** POST /admin/categories */
export const create = handler({ body: createCategoryBody }, async ({ body }, _req, res) => {
  created(res, await categories.createCategory(body));
});

/** PUT /admin/categories/order */
export const reorder = handler({ body: reorderBody }, async ({ body }, _req, res) => {
  await categories.reorderCategories(body.slugs);
  ok(res, await categories.listAllCategories());
});

/** PATCH /admin/categories/:slug */
export const update = handler({ params: slugParams, body: updateCategoryBody }, async ({ params, body }, _req, res) => {
  ok(res, await categories.updateCategory(params.slug, body));
});

/** DELETE /admin/categories/:slug */
export const remove = handler({ params: slugParams }, async ({ params }, _req, res) => {
  await categories.deleteCategory(params.slug);
  noContent(res);
});
