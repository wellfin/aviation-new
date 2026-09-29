"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { fieldErrors as flatten, type FieldErrors } from "@/lib/api/forms";

export type FormResult =
  | { status: "idle" }
  | { status: "success"; message: string }
  /** `code`/`httpStatus` come from the API error envelope so forms can offer a next step (sign in, verify email…). */
  | { status: "error"; message: string; code?: string; httpStatus?: number };

/** User-facing message for a failed API call (rate limits and network failures get friendlier copy). */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return err.body.message || "Too many attempts. Please wait a few minutes and try again.";
    return err.body.message;
  }
  if (err instanceof TypeError) return "We couldn't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Minimal form state helper: collects FormData, validates with a zod schema,
 * calls `onValid`, and maps API validation errors back onto fields.
 */
export function useZodForm<S extends z.ZodTypeAny>(
  schema: S,
  onValid: (data: z.infer<S>) => Promise<string | void>,
  options?: { transform?: (fd: FormData) => Record<string, unknown>; resetOnSuccess?: boolean },
) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FormResult>({ status: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const raw = options?.transform ? options.transform(fd) : Object.fromEntries(fd.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(flatten(parsed.error));
      setResult({ status: "idle" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const message = await onValid(parsed.data);
      setResult({ status: "success", message: message ?? "Thanks — we've received your submission." });
      if (options?.resetOnSuccess !== false) form.reset();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setResult({ status: "error", message: apiErrorMessage(err), code: err.body.code, httpStatus: err.status });
      } else {
        setResult({ status: "error", message: apiErrorMessage(err) });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { errors, submitting, result, handleSubmit, setErrors };
}
