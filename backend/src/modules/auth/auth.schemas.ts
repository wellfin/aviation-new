import { z } from "zod";
import { ACCOUNT_SERVICES } from "../users/user.model.js";

export const email = z.string().trim().toLowerCase().min(1, "Email is required").max(254).email("Enter a valid email address");
const name = z.string().trim().min(2, "Please enter at least 2 characters").max(100);
export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");
export const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s-]*$/, "Enter a valid phone number");
const otpCode = z.string().trim().regex(/^\d{4,8}$/, "Enter the code from your email");

export const registerSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password,
  accountType: z.enum(["user", "provider"]).default("user"),
  phone: phone.optional(),
  service: z.enum(ACCOUNT_SERVICES).optional(),
  company: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).optional(),
  plan: z.string().trim().max(40).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
  remember: z.boolean().optional().default(false),
});

export const verifyEmailSchema = z.object({ email, code: otpCode });
export const emailOnlySchema = z.object({ email });
export const resetPasswordSchema = z.object({ email, code: otpCode, password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });

export const updateProfileSchema = z
  .object({
    firstName: name,
    lastName: name,
    phone: phone.nullable(),
    company: z.string().trim().max(120).nullable(),
  })
  .partial();
