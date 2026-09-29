import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Billing } from "./BillingToggle";
import { PlanCta } from "./PlanCta";

const THEME: Record<PricingPlan["id"], { name: string; check: string; cta: string; card: string }> = {
  basic: {
    name: "text-brand",
    check: "text-brand",
    cta: "border-[1.5px] border-brand text-brand bg-white hover:bg-brand/5",
    card: "shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]",
  },
  pro: {
    name: "text-brand-cyan",
    check: "text-brand-cyan",
    cta: "bg-brand-cyan text-white hover:brightness-105",
    card: "shadow-[0_20px_30px_rgba(0,194,255,0.2)]",
  },
  ultra_pro: {
    name: "text-warning",
    check: "text-warning",
    cta: "bg-[linear-gradient(170deg,#f4b400_0%,#ffaa00_100%)] text-white hover:brightness-105",
    card: "shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]",
  },
  enterprise: {
    name: "text-navy-900",
    check: "text-navy-900",
    cta: "bg-navy-900 text-white hover:bg-navy-800",
    card: "shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]",
  },
};

function priceFor(plan: PricingPlan, billing: Billing): { amount: string; suffix: string } | null {
  const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  if (price === null) return null;
  if (price === 0) return { amount: "$0", suffix: "forever" };
  return { amount: `$${price}`, suffix: billing === "yearly" ? "/Yr" : "/Mo" };
}

export function PlanCard({ plan, billing }: { plan: PricingPlan; billing: Billing }) {
  const theme = THEME[plan.id];
  const price = priceFor(plan, billing);

  return (
    <article className={cn("relative flex flex-col rounded-[20px] bg-white p-7", theme.card)} aria-labelledby={`plan-${plan.id}`}>
      {plan.highlighted && (
        <span className="absolute top-[15px] right-4 rounded-full border border-brand-cyan/25 bg-brand-cyan/12 px-2.5 py-1 text-[11px] font-bold leading-[16.5px] tracking-[0.55px] text-brand-cyan uppercase">
          Most Popular
        </span>
      )}
      <h2 id={`plan-${plan.id}`} className={cn("text-lg leading-7 font-bold", theme.name)}>
        {plan.name}
      </h2>
      <p className="pt-1 text-xs leading-4 text-subtle">{plan.tagline}</p>
      <p className="flex items-end gap-1 pt-4 pb-5">
        {price ? (
          <>
            <span className="text-[36px] leading-10 font-extrabold text-ink">{price.amount}</span>
            <span className="pb-1 text-sm leading-5 text-subtle">{price.suffix}</span>
          </>
        ) : (
          <span className="text-[28px] leading-10 font-extrabold text-ink">Custom</span>
        )}
      </p>
      <PlanCta plan={plan} billing={billing} className={cn("flex h-[52px] items-center rounded-xl px-7 text-[15px] font-semibold transition", theme.cta)} />
      <ul className="mt-5 flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm leading-5 text-muted">
            <Check className={cn("mt-0.5 size-3.5 shrink-0", theme.check)} strokeWidth={2.5} aria-hidden />
            {f}
          </li>
        ))}
      </ul>
    </article>
  );
}
