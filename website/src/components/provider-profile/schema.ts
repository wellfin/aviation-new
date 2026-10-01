import { z } from "zod";
import { workEmail } from "@/lib/api/forms";
import { isTodayOrLater } from "@/lib/dates";

/** "Share Your Experience" review form on the provider profile. */
export const reviewSchema = z.object({
  rating: z.coerce.number({ error: "Please choose a rating" }).int("Please choose a rating").min(1, "Please choose a rating").max(5, "Please choose a rating"),
  title: z.string().trim().min(3, "Please add a short title").max(120),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
  /** Optional job title shown next to the author's name; "" is omitted from the payload. */
  role: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || undefined),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/** "Aircraft Fleet Enquiry" (charter operators / brokers). */
export const fleetEnquirySchema = z.object({
  providerSlug: z.string().min(1),
  aircraftId: z.string().min(1),
  tripType: z.enum(["one-way", "round-trip", "multi-leg"]),
  from: z.string().trim().min(3, "Enter a departure airport").max(80),
  to: z.string().trim().min(3, "Enter a destination airport").max(80),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a departure date")
    .refine((v) => isTodayOrLater(v), "Departure date can't be in the past"),
  time: z.string().trim().max(5).optional().or(z.literal("")),
  passengers: z.coerce.number().int().min(1, "At least 1 passenger").max(500),
  name: z.string().trim().min(2, "Please enter at least 2 characters").max(100),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: workEmail,
  dialCode: z.string().max(6).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
});
