import { Router } from "express";
import { handler, noContent, ok } from "../../lib/http.js";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { providerParams } from "./favorites.schemas.js";
import { addFavorite, listFavorites, removeFavorite } from "./favorites.service.js";

/** Saved providers of the signed-in user: /me/favorites */
export const favoritesRouter = Router();
favoritesRouter.use(requirePermission("favorites:manage"));

favoritesRouter.get(
  "/",
  handler({}, async (_input, req, res) => ok(res, await listFavorites(currentUser(req)))),
);

favoritesRouter.put(
  "/:providerId",
  handler({ params: providerParams }, async ({ params }, req, res) => {
    await addFavorite(currentUser(req), params.providerId);
    noContent(res);
  }),
);

favoritesRouter.delete(
  "/:providerId",
  handler({ params: providerParams }, async ({ params }, req, res) => {
    await removeFavorite(currentUser(req), params.providerId);
    noContent(res);
  }),
);
