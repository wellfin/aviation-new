import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { handler, ok } from "../../lib/http.js";
import { planParams, upsertPlanBody } from "./pricing.schemas.js";
import * as pricing from "./pricing.service.js";

/** Public: mounted at /pricing */
export const pricingRouter = Router();

pricingRouter.get("/plans", async (_req, res) => {
  ok(res, await pricing.listPublicPlans());
});

/** Admin: mounted at /admin/pricing */
export const adminPricingRouter = Router();
adminPricingRouter.use(requirePermission("pricing:manage"));

adminPricingRouter.get("/plans", async (_req, res) => {
  ok(res, await pricing.listAdminPlans());
});

adminPricingRouter.get(
  "/plans/:id",
  handler({ params: planParams }, async ({ params }, _req, res) => {
    ok(res, await pricing.getAdminPlan(params.id));
  }),
);

adminPricingRouter.put(
  "/plans/:id",
  handler({ params: planParams, body: upsertPlanBody }, async ({ params, body }, _req, res) => {
    const { plan, created } = await pricing.upsertPlan(params.id, body);
    ok(res, plan, created ? 201 : 200);
  }),
);
