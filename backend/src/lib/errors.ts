/**
 * Application error carrying an HTTP status and a stable machine-readable code.
 * Only AppError messages are shown to clients; anything else becomes a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string>, code = "BAD_REQUEST") =>
  new AppError(400, code, message, fieldErrors);
export const validationError = (fieldErrors: Record<string, string>) =>
  new AppError(422, "VALIDATION_ERROR", "Please correct the highlighted fields.", fieldErrors);
export const unauthorized = (message = "Please sign in to continue.", code = "UNAUTHORIZED") => new AppError(401, code, message);
export const forbidden = (message = "You don't have permission to do that.") => new AppError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string, fieldErrors?: Record<string, string>, code = "CONFLICT") =>
  new AppError(409, code, message, fieldErrors);
export const tooMany = (message = "Too many attempts. Please try again later.") => new AppError(429, "TOO_MANY_REQUESTS", message);
export const serviceUnavailable = (message: string) => new AppError(503, "SERVICE_UNAVAILABLE", message);
