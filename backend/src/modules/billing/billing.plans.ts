import { badRequest, serviceUnavailable } from "../../lib/errors.js";
import type { BillingCycle, PaidPlan } from "./billing.models.js";

/** The subset of a pricing plan billing depends on (owned by the pricing module). */
export interface BillingPlan {
  id: PaidPlan;
  name: string;
  /** Major currency units (e.g. rupees); null means not sold on that cycle. */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: string;
  active?: boolean;
  razorpayPlanIds: { monthly?: string | null; yearly?: string | null };
}

/** Lazily imported so billing never forms a load-time cycle with the pricing module. */
export async function findBillingPlan(id: PaidPlan): Promise<BillingPlan | null> {
  const { getPlanForBilling } = await import("../pricing/pricing.service.js");
  const plan: BillingPlan | null = await getPlanForBilling(id);
  return plan;
}

export interface ResolvedPlan {
  plan: BillingPlan;
  razorpayPlanId: string;
  /** Per-cycle amount in the smallest currency unit. */
  amount: number;
}

/** Converts a major-unit price to integer minor units without float drift (e.g. 49.99 → 4999). */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

/** Resolves the Razorpay plan + price for a plan/cycle, or explains why it can't be sold. */
export async function resolvePlan(id: PaidPlan, cycle: BillingCycle): Promise<ResolvedPlan> {
  const plan = await findBillingPlan(id);
  if (!plan || plan.active === false) throw badRequest("That plan is not available.", { plan: "Not available" });
  const razorpayPlanId = plan.razorpayPlanIds[cycle];
  const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  if (!razorpayPlanId || price === null || price === undefined) {
    throw serviceUnavailable(`The ${plan.name} plan can't be purchased ${cycle} yet. Please contact us.`);
  }
  return { plan, razorpayPlanId, amount: toMinorUnits(price) };
}
