import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { credentialRateLimit, sessionRateLimit } from "../../middleware/security.js";
import * as controller from "./admin-auth.controller.js";

/** Mounted at /admin/auth — staff console sign-in, separate from the website's /auth. */
export const adminAuthRouter = Router();
adminAuthRouter.post("/login", credentialRateLimit, controller.login);
adminAuthRouter.post("/refresh", sessionRateLimit, controller.refresh);
adminAuthRouter.post("/logout", controller.logout);
adminAuthRouter.get("/me", requireAuth, controller.me);
adminAuthRouter.post("/change-password", requireAuth, credentialRateLimit, controller.changePassword);
