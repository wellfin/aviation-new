import type { AppError } from "../lib/errors.js";
import type { UserDoc } from "../modules/users/user.model.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware when a valid session is present. */
      user?: UserDoc;
      /** Why a presented access token was rejected (surfaced by `requireAuth`). */
      authError?: AppError;
      /** Raw request body (only captured for webhook routes that verify signatures). */
      rawBody?: Buffer;
    }
  }
}

export {};
