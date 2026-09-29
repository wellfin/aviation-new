import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import * as controller from "./category.controller.js";

/** Public: active categories in display order. */
export const categoriesRouter = Router();
categoriesRouter.get("/", controller.listPublic);

/** Admin: manage the service catalogue (providers:manage). */
export const adminCategoriesRouter = Router();
adminCategoriesRouter.use(requirePermission("providers:manage"));
adminCategoriesRouter.get("/", controller.listAll);
adminCategoriesRouter.post("/", controller.create);
adminCategoriesRouter.put("/order", controller.reorder);
adminCategoriesRouter.patch("/:slug", controller.update);
adminCategoriesRouter.delete("/:slug", controller.remove);
