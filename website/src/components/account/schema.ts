import { z } from "zod";

/** Mirrors backend auth.schemas.ts (updateProfileSchema / changePasswordSchema). */

const name = z.string().trim().min(2, "Please enter at least 2 characters").max(100, "Use at most 100 characters");
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Use at most ${max} characters`)
    .transform((v) => (v === "" ? null : v));

export const profileSchema = z.object({
  firstName: name,
  lastName: name,
  phone: z
    .string()
    .trim()
    .max(30, "Use at most 30 characters")
    .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
    .transform((v) => (v === "" ? null : v)),
  company: optionalText(120),
});

export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Choose a password you haven't used here", path: ["newPassword"] });
