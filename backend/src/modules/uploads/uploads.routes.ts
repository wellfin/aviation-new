import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { isTest } from "../../config/env.js";
import { notFound, validationError } from "../../lib/errors.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { logger } from "../../lib/logger.js";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { getStorage } from "./storage.js";
import { fileKeyParams, myUploadsQuery, uploadBody, uploadIdParams } from "./uploads.schemas.js";
import { createUpload, deleteUpload, findUploadByKey, listUploads, maxUploadBytes } from "./uploads.service.js";

const uploadLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: isTest ? 10_000 : 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: "TOO_MANY_REQUESTS", message: "Too many uploads. Please try again later." } });
  },
});

/** Files are buffered in memory (bounded by the size limit) so magic bytes are checked before anything is written. */
const singleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes(), files: 1, fields: 4, fieldSize: 1024, parts: 5 },
}).single("file");

/** Mounted at /uploads. */
export const uploadsRouter = Router();

uploadsRouter.post(
  "/",
  requirePermission("uploads:create"),
  uploadLimiter,
  singleFile,
  handler({ body: uploadBody }, async ({ body }, req, res) => {
    const user = currentUser(req);
    if (!req.file) throw validationError({ file: "Please choose a file to upload." });
    created(res, await createUpload(user._id, body.kind, req.file));
  }),
);

uploadsRouter.delete(
  "/:id",
  requirePermission("uploads:create"),
  handler({ params: uploadIdParams }, async ({ params }, req, res) => {
    const user = currentUser(req);
    await deleteUpload(params.id, { _id: user._id, role: user.role });
    noContent(res);
  }),
);

/** Mounted at /me/uploads. */
export const myUploadsRouter = Router();

myUploadsRouter.get(
  "/",
  requirePermission("uploads:create"),
  handler({ query: myUploadsQuery }, async ({ query }, req, res) => {
    ok(res, await listUploads(currentUser(req)._id, query));
  }),
);

/** Mounted at /files — public, immutable file delivery. */
export const filesRouter = Router();

function dispositionFor(kind: string, originalName: string): string {
  if (kind === "image") return "inline";
  const name = (originalName || "document.pdf").replace(/["\\]/g, "");
  return `attachment; filename="${name}"`;
}

filesRouter.get(
  "/*key",
  handler({ params: fileKeyParams }, async ({ params }, _req, res) => {
    const record = await findUploadByKey(params.key);
    if (!record) throw notFound("File");
    const object = await getStorage().open(record.key);
    if (!object) throw notFound("File");

    res.set({
      "Content-Type": record.mime,
      "Content-Length": String(object.size),
      "Content-Disposition": dispositionFor(record.kind, record.originalName ?? ""),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    try {
      await pipeline(object.stream, res);
    } catch (err) {
      // Headers are already sent; client aborts are routine.
      logger.warn({ err, key: record.key }, "File stream interrupted");
      res.destroy();
    }
  }),
);
