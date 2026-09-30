import { z } from "zod";

/**
 * Client-side form rules for the console's own forms. The backend validates the
 * same input independently — these only give instant feedback.
 */

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
  remember: z.boolean().optional(),
});

export type FieldErrors = Record<string, string>;

/** Flattens zod issues into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
