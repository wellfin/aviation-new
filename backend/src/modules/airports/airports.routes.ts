import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import {
  adminListAirportsQuery,
  codeParams,
  createAirportBody,
  distanceQuery,
  icaoParams,
  listAirportsQuery,
  nearbyQuery,
  updateAirportBody,
} from "./airports.schemas.js";
import * as airports from "./airports.service.js";

/** Public airport directory: /airports */
export const airportsRouter = Router();

airportsRouter.get(
  "/",
  handler({ query: listAirportsQuery }, async ({ query }, _req, res) => ok(res, await airports.listAirports(query))),
);

airportsRouter.get(
  "/featured",
  handler({}, async (_input, _req, res) => ok(res, await airports.featuredAirports())),
);

airportsRouter.get(
  "/distance",
  handler({ query: distanceQuery }, async ({ query }, _req, res) => ok(res, await airports.distanceBetween(query.from, query.to, query.speedKts))),
);

airportsRouter.get(
  "/:code/nearby",
  handler({ params: codeParams, query: nearbyQuery }, async ({ params, query }, _req, res) =>
    ok(res, await airports.nearbyAirports(params.code, query.radiusKm, query.limit)),
  ),
);

airportsRouter.get(
  "/:code",
  handler({ params: codeParams }, async ({ params }, _req, res) => ok(res, await airports.getAirport(params.code))),
);

/** Airport data management: /admin/airports */
export const adminAirportsRouter = Router();
adminAirportsRouter.use(requirePermission("airports:manage"));

adminAirportsRouter.get(
  "/",
  handler({ query: adminListAirportsQuery }, async ({ query }, _req, res) => ok(res, await airports.adminListAirports(query))),
);

adminAirportsRouter.post(
  "/",
  handler({ body: createAirportBody }, async ({ body }, _req, res) => created(res, await airports.createAirport(body))),
);

adminAirportsRouter.get(
  "/:icao",
  handler({ params: icaoParams }, async ({ params }, _req, res) => ok(res, await airports.adminGetAirport(params.icao))),
);

adminAirportsRouter.patch(
  "/:icao",
  handler({ params: icaoParams, body: updateAirportBody }, async ({ params, body }, _req, res) =>
    ok(res, await airports.updateAirport(params.icao, body)),
  ),
);

adminAirportsRouter.delete(
  "/:icao",
  handler({ params: icaoParams }, async ({ params }, _req, res) => {
    await airports.deleteAirport(params.icao);
    noContent(res);
  }),
);
