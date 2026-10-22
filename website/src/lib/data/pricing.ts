import "server-only";
import { config } from "@/lib/config";
import { PRICING_PLANS } from "@/lib/mock/pricing";
import type { PricingPlan } from "@/lib/types";
import { apiGet } from "./http";

export async function listPricingPlans(): Promise<PricingPlan[]> {
  if (config.DATA_SOURCE === "mock") return PRICING_PLANS;
  // Not cached: a price saved in the admin panel shows on the next page load.
  return (await apiGet<PricingPlan[]>("/pricing/plans", { noStore: true })) ?? [];
}
