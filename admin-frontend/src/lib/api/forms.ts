import { z } from "zod";

/**
 * Form schemas shared by every public form. The backend must validate the same
 * rules independently — these only give users instant feedback.
 */

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254);
const name = z.string().trim().min(2, "Please enter at least 2 characters").max(100);
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));
const message = z.string().trim().min(10, "Please enter at least 10 characters").max(5000);

export const newsletterSchema = z.object({ email });

export const enquirySchema = z.object({
  providerSlug: z.string().min(1),
  name,
  email,
  dialCode: z.string().max(6).optional(),
  phone,
  service: z.string().trim().min(1, "Please select a service"),
  message,
});

export const contactSchema = z.object({
  name,
  email,
  phone,
  company: z.string().trim().max(120).optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Please choose a subject").max(120),
  message,
});

export const advertiseSchema = z.object({
  name,
  email,
  company: z.string().trim().min(2, "Company is required").max(120),
  phone,
  placement: z.string().trim().min(1, "Please choose an ad format"),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const demoRequestSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  company: z.string().trim().min(2, "Company is required").max(120),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  phone,
  interest: z.string().trim().min(1, "Please choose an option").max(120),
  preferredDate: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const dataLicenceSchema = z.object({
  name,
  email,
  company: z.string().trim().min(2, "Company is required").max(120),
  datasets: z.array(z.string()).min(1, "Select at least one dataset"),
  useCase: message,
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
  remember: z.boolean().optional(),
});

export const signupSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email });

export const otpSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

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

/** Password strength 0–4 used by the signup meter. */
export function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return score;
}
