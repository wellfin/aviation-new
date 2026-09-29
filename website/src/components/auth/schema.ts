import { z } from "zod";
import { otpSchema, passwordSchema } from "@/lib/api/forms";

/** Services a new member can pick on signup step 02; anything but "pilot" is a provider account. */
export const SIGNUP_SERVICES = [
  { value: "pilot", label: "Pilot / Individual", emoji: null },
  { value: "business", label: "Aviation Business", emoji: "🏢" },
  { value: "charter", label: "Charter Operator", emoji: "🛩️" },
  { value: "airport", label: "Airport Authority", emoji: "✈️" },
] as const;

export type SignupService = (typeof SIGNUP_SERVICES)[number]["value"];

const serviceValues = SIGNUP_SERVICES.map((s) => s.value) as [SignupService, ...SignupService[]];

/** Signup step 02 — contact + business details. Company is required for provider accounts. */
export const signupDetailsSchema = z
  .object({
    country: z.string().trim().length(2),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[\d\s()-]*$/, "Enter a valid phone number")
      .refine((v) => v === "" || v.replace(/\D/g, "").length >= 6, "Enter a valid phone number"),
    service: z.enum(serviceValues, { message: "Please choose what describes you best" }),
    company: z.string().trim().max(120),
  })
  .superRefine((v, ctx) => {
    if (v.service !== "pilot" && v.company.length < 2) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "Company name is required for business accounts" });
    }
  });

/** Reset password — email + emailed code + new password (confirmed). */
export const resetWithCodeSchema = otpSchema
  .extend({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
