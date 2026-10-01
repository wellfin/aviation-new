"use client";

import Link from "next/link";
import { can, useAuth } from "@/lib/auth/auth-context";
import type { PricingPlan } from "@/lib/types";

/**
 * Plan call-to-action. Signed-in providers go straight to billing with the plan
 * pre-selected; everyone else signs up as a provider with the plan carried through.
 */
export function PlanCta({ plan, className }: { plan: PricingPlan; className: string }) {
  const { user } = useAuth();
  const query = `plan=${plan.id}&billing=yearly`;
  let href = `/signup?type=provider&${query}`;
  if (user && can(user, "billing:manage:own")) {
    href = plan.id === "enterprise" ? "/request-demo" : `/account/billing?${query}`;
  }
  return (
    <Link href={href} className={className}>
      {plan.cta}
    </Link>
  );
}
