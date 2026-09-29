import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { UPLOAD_KINDS } from "./upload.model.js";

export const uploadBody = z.object({ kind: z.enum(UPLOAD_KINDS) });

export const uploadIdParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

export const myUploadsQuery = paginationQuery.extend({ kind: z.enum(UPLOAD_KINDS).optional() });

/**
 * Express 5 `/*key` wildcard yields the path segments as an array. Any malformed
 * key is simply "not found" (the service only accepts the strict key pattern).
 */
export const fileKeyParams = z.object({
  key: z.array(z.string()).transform((segments) => segments.join("/").slice(0, 200)),
});
