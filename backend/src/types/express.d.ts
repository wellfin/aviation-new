import type { AppError } from "../lib/errors.js";
import type { Permission } from "../modules/rbac/permissions.js";
import type { UserDoc } from "../modules/users/user.model.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware when a valid session is present. */
      user?: UserDoc;
      /** Why a presented access token was rejected (surfaced by `requireAuth`). */
      authError?: AppError;
      /** Permissions of the signed-in user (custom staff role, else the role's defaults). */
      permissions?: ReadonlySet<Permission>;
      /** Raw request body (only captured for webhook routes that verify signatures). */
      rawBody?: Buffer;
    }
  }
}

export {};
