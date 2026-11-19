import { Router } from "express";
import { handler, ok } from "../../lib/http.js";
import { requirePermission } from "../../middleware/auth.js";
import { overviewQuery, timeseriesQuery } from "./reports.schemas.js";
import { insights, overview, timeseries } from "./reports.service.js";

/** Mounted at /admin/reports. */
export const reportsRouter = Router();

reportsRouter.get(
  "/overview",
  requirePermission("reports:read"),
  handler({ query: overviewQuery }, async ({ query }, _req, res) => {
    ok(res, await overview(query));
  }),
);

/** Top listings, services, airports, ad totals and latest activity for the dashboard. */
reportsRouter.get(
  "/insights",
  requirePermission("reports:read"),
  handler({ query: overviewQuery }, async ({ query }, req, res) => {
    const data = await insights(query);
    // Names in the latest activity are only for staff who can open those pages.
    const can = (p: Parameters<NonNullable<typeof req.permissions>["has"]>[0]) => req.permissions?.has(p) ?? false;
    ok(res, { ...data, recentEnquiries: can("enquiries:read:any") ? data.recentEnquiries : [], recentLeads: can("leads:read") ? data.recentLeads : [] });
  }),
);

reportsRouter.get(
  "/timeseries",
  requirePermission("reports:read"),
  handler({ query: timeseriesQuery }, async ({ query }, _req, res) => {
    ok(res, await timeseries(query));
  }),
);
