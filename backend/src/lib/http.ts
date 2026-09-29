import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { validationError } from "./errors.js";

/** Standard success envelope: { data }. */
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function created<T>(res: Response, data: T): void {
  ok(res, data, 201);
}

export function noContent(res: Response): void {
  res.status(204).end();
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parses `input` with `schema` or throws a 422 with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(zodFieldErrors(result.error));
  return result.data;
}

type Parts = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };

export interface Validated<P extends Parts> {
  body: P["body"] extends z.ZodType ? z.infer<P["body"]> : undefined;
  query: P["query"] extends z.ZodType ? z.infer<P["query"]> : undefined;
  params: P["params"] extends z.ZodType ? z.infer<P["params"]> : undefined;
}

/**
 * Wraps a handler so that body/query/params are validated first.
 * The handler receives the parsed, typed values — never the raw request input.
 */
export function handler<P extends Parts>(
  parts: P,
  fn: (input: Validated<P>, req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): RequestHandler {
  return async (req, res, next) => {
    const input = {
      body: parts.body ? parse(parts.body, req.body ?? {}) : undefined,
      query: parts.query ? parse(parts.query, req.query) : undefined,
      params: parts.params ? parse(parts.params, req.params) : undefined,
    } as Validated<P>;
    await fn(input, req, res, next);
  };
}
