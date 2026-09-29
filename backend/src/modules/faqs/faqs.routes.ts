import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { adminFaqQuery, createFaqBody, idParams, publicFaqQuery, reorderBody, updateFaqBody } from "./faqs.schemas.js";
import * as faqs from "./faqs.service.js";

/** Public: mounted at /faqs */
export const faqsRouter = Router();

faqsRouter.get(
  "/",
  handler({ query: publicFaqQuery }, async ({ query }, _req, res) => {
    ok(res, await faqs.listPublishedFaqs(query.category));
  }),
);

/** Admin: mounted at /admin/faqs */
export const adminFaqsRouter = Router();
adminFaqsRouter.use(requirePermission("content:manage"));

adminFaqsRouter.get(
  "/",
  handler({ query: adminFaqQuery }, async ({ query }, _req, res) => {
    ok(res, await faqs.listAdminFaqs(query));
  }),
);

adminFaqsRouter.post(
  "/",
  handler({ body: createFaqBody }, async ({ body }, _req, res) => {
    created(res, await faqs.createFaq(body));
  }),
);

// Registered before "/:id" routes so "order" is never parsed as an id.
adminFaqsRouter.put(
  "/order",
  handler({ body: reorderBody }, async ({ body }, _req, res) => {
    ok(res, await faqs.reorderFaqs(body.ids));
  }),
);

adminFaqsRouter.get(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await faqs.getAdminFaq(params.id));
  }),
);

adminFaqsRouter.patch(
  "/:id",
  handler({ params: idParams, body: updateFaqBody }, async ({ params, body }, _req, res) => {
    ok(res, await faqs.updateFaq(params.id, body));
  }),
);

adminFaqsRouter.delete(
  "/:id",
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await faqs.deleteFaq(params.id);
    noContent(res);
  }),
);
