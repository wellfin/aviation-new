import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { isProduction } from "../config/env.js";
import { isDuplicateKeyError } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found.` } });
};

/**
 * Converts every error into the `{ error: { code, message, fieldErrors? } }` envelope.
 * Internal details (stack traces, driver messages) never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "That file is too large." : "Invalid file upload.";
    appError = new AppError(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, "INVALID_UPLOAD", message);
  } else if (err instanceof SyntaxError && "body" in err) {
    appError = new AppError(400, "INVALID_JSON", "Request body is not valid JSON.");
  } else if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.too.large") {
    appError = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  } else if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "value";
    appError = new AppError(409, "DUPLICATE", "That value is already in use.", { [field]: "Already exists" });
  } else if (err instanceof mongoose.Error.ValidationError) {
    const fieldErrors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    appError = new AppError(422, "VALIDATION_ERROR", "Please correct the highlighted fields.", fieldErrors);
  } else if (err instanceof mongoose.Error.CastError) {
    appError = new AppError(400, "INVALID_ID", "Invalid identifier.");
  } else {
    logger.error({ err, method: req.method, path: req.path }, "Unhandled error");
    appError = new AppError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }

  if (err instanceof AppError && err.status >= 500) logger.warn({ code: err.code, path: req.path }, err.message);

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fieldErrors ? { fieldErrors: appError.fieldErrors } : {}),
      ...(!isProduction && appError.status === 500 && err instanceof Error ? { debug: err.message } : {}),
    },
  });
};
