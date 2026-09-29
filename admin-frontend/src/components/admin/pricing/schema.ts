import { z } from "zod";

export const PLAN_IDS = ["basic", "pro", "ultra_pro", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_LABEL: Record<PlanId, string> = { basic: "Basic", pro: "Pro", ultra_pro: "Ultra Pro", enterprise: "Enterprise" };

/** `GET /admin/pricing/plans` item. Prices are in major currency units (e.g. 49.99), not paise. */
export interface AdminPlan {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlighted: boolean;
  features: string[];
  cta: string;
  currency: string;
  active: boolean;
  order: number;
  razorpayPlanIds: { monthly: string | null; yearly: string | null };
  updatedAt: string | null;
}

/** Empty = no fixed price (e.g. "Contact us"). */
const price = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,9}(\.\d{1,2})?$/.test(v), "Enter an amount like 49 or 49.99")
  .refine((v) => v === "" || Number(v) <= 100_000_000, "Maximum 100,000,000")
  .transform((v) => (v === "" ? null : Math.round(Number(v) * 100) / 100));

const razorpayId = z
  .string()
  .trim()
  .refine((v) => v === "" || /^plan_[A-Za-z0-9]{6,40}$/.test(v), "Use a Razorpay plan id (plan_…)")
  .transform((v) => (v === "" ? null : v));

/** Mirrors the backend `upsertPlanBody`; form strings are converted to the API's types. */
export const planFormSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(60, "Use at most 60 characters"),
  tagline: z.string().trim().max(200, "Use at most 200 characters"),
  monthlyPrice: price,
  yearlyPrice: price,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
  highlighted: z.boolean(),
  features: z.array(z.string().trim().min(1, "Features can't be empty").max(200, "Use at most 200 characters")).max(50, "At most 50 features"),
  cta: z.string().trim().min(2, "Use at least 2 characters").max(60, "Use at most 60 characters"),
  active: z.boolean(),
  order: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Use a whole number")
    .transform(Number)
    .refine((n) => n <= 1000, "Maximum 1000"),
  razorpayPlanIds: z.object({ monthly: razorpayId, yearly: razorpayId }),
});

export type PlanFormValues = z.input<typeof planFormSchema>;
