import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { requirePermission } from "../../middleware/auth.js";
import { GRANTABLE_PERMISSIONS } from "./permissions.js";
import * as roles from "./staff-roles.service.js";

/** Custom staff roles. Mounted at /admin/roles. Reading needs users:read; changes need users:manage (ADMIN only). */
export const adminRolesRouter = Router();

const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

const permissionList = z
  .array(z.enum(GRANTABLE_PERMISSIONS))
  .min(1, "Choose at least one permission")
  .transform((list) => [...new Set(list)]);

const roleFields = {
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60),
  description: z.string().trim().max(200).optional(),
  permissions: permissionList,
};

const createBody = z.object(roleFields);
const updateBody = z
  .object(roleFields)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

/** The permissions a custom role can be given (labels live in the console). */
adminRolesRouter.get("/permissions", requirePermission("users:read"), (_req: Request, res: Response) => {
  ok(res, GRANTABLE_PERMISSIONS);
});

adminRolesRouter.get("/", requirePermission("users:read"), async (_req: Request, res: Response) => {
  ok(res, await roles.listStaffRoles());
});

adminRolesRouter.get(
  "/:id",
  requirePermission("users:read"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await roles.getStaffRole(params.id));
  }),
);

adminRolesRouter.post(
  "/",
  requirePermission("users:manage"),
  handler({ body: createBody }, async ({ body }, _req, res) => {
    created(res, await roles.createStaffRole(body));
  }),
);

adminRolesRouter.patch(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams, body: updateBody }, async ({ params, body }, _req, res) => {
    ok(res, await roles.updateStaffRole(params.id, body));
  }),
);

adminRolesRouter.delete(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    await roles.deleteStaffRole(params.id);
    noContent(res);
  }),
);
