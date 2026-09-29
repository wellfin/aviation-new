import { Router } from "express";
import { handler, ok } from "../../lib/http.js";
import { requirePermission } from "../../middleware/auth.js";
import { overviewQuery, timeseriesQuery } from "./reports.schemas.js";
import { overview, timeseries } from "./reports.service.js";

/** Mounted at /admin/reports. */
export const reportsRouter = Router();

reportsRouter.get(
  "/overview",
  requirePermission("reports:read"),
  handler({ query: overviewQuery }, async ({ query }, _req, res) => {
    ok(res, await overview(query));
  }),
);

reportsRouter.get(
  "/timeseries",
  requirePermission("reports:read"),
  handler({ query: timeseriesQuery }, async ({ query }, _req, res) => {
    ok(res, await timeseries(query));
  }),
);
