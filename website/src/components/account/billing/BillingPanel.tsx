"use client";

import { Check, Crown, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Card, ConfirmButton, DataTable, EmptyState, ErrorPanel, formatDateTime, formatMoney, Pager, PageHeader, StatusPill, type Column } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ApiError, apiRequest } from "@/lib/api/client";
import { withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { PricingPlan } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useAccount } from "../AccountShell";
import { useAccountApi } from "../hooks";
import {
  LIVE_SUBSCRIPTION_STATUSES,
  TIER_LABEL,
  type BillingCycle,
  type CheckoutSession,
  type Listing,
  type PaidPlan,
  type Paginated,
  type Payment,
  type SubscriptionOverview,
} from "../types";
import { Notice, RequirePermission } from "../ui";
import { openSubscriptionCheckout } from "./razorpay";

const PAID: PaidPlan[] = ["pro", "ultra_pro"];

/** What each paid tier unlocks on the listing (mirrors the backend TIER_LIMITS). */
const UNLOCKS: Record<PaidPlan, string[]> = {
  pro: ["Up to 12 gallery images", "Social media links", "Receive enquiries from your profile", "Pro badge & priority placement"],
  ultra_pro: ["Up to 30 gallery images", "Profile video", "Social media links", "Receive enquiries from your profile", "Ultra Pro badge & top placement"],
};

type Banner = {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  body: string;
  action?: "listing";
};

function parsePlan(v: string | null): PaidPlan | null {
  if (!v) return null;
  const n = v.toLowerCase().replace(/-/g, "_");
  return n === "pro" || n === "ultra_pro" ? n : null;
}

export function BillingPanel() {
  return (
    <RequirePermission permission="billing:manage:own" title="Plan & billing">
      <Billing />
    </RequirePermission>
  );
}

function Billing() {
  const { user, profile } = useAccount();
  const search = useSearchParams();
  const { page } = useUrlParams();
  const [cycle, setCycle] = useState<BillingCycle>(search.get("billing") === "monthly" ? "monthly" : "yearly");
  const [selected, setSelected] = useState<PaidPlan | null>(parsePlan(search.get("plan")));
  const [busy, setBusy] = useState<PaidPlan | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const plansRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const overview = useAccountApi<SubscriptionOverview>("/billing/subscription");
  const payments = useAccountApi<Paginated<Payment>>(withQuery("/billing/payments", { page, pageSize: 10 }));
  const listing = useAccountApi<Listing>("/me/listing");
  const plans = useAccountApi<PricingPlan[]>("/pricing/plans");

  const deepLinked = search.has("plan");
  useEffect(() => {
    if (deepLinked) plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [deepLinked]);

  // Outcomes (503, 409, success…) are announced at the top; bring them into view.
  useEffect(() => {
    if (banner)
      bannerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [banner]);

  const sub = overview.data?.subscription ?? null;
  const live = sub !== null && LIVE_SUBSCRIPTION_STATUSES.includes(sub.status);
  const noListing = listing.error instanceof ApiError && listing.error.status === 404;
  const tier = listing.data?.tier ?? overview.data?.listing?.tier ?? "basic";

  function refresh() {
    overview.reload();
    payments.reload();
    listing.reload();
  }

  function explain(err: unknown): Banner {
    if (err instanceof ApiError) {
      if (err.status === 503)
        return {
          tone: "warning",
          title: "Online payments aren't available yet",
          body: `${err.body.message} Please contact us to upgrade, or try again later.`,
        };
      if (err.status === 409)
        return {
          tone: "warning",
          title: "You already have a subscription",
          body: err.body.message,
        };
      if (err.body.code === "NO_LISTING")
        return {
          tone: "info",
          title: "Create your listing first",
          body: err.body.message,
          action: "listing",
        };
      return {
        tone: "danger",
        title: "We couldn't start checkout",
        body: err.body.fieldErrors ? Object.values(err.body.fieldErrors).join(" ") : err.body.message,
      };
    }
    return {
      tone: "danger",
      title: "We couldn't start checkout",
      body: err instanceof Error ? err.message : "Please try again.",
    };
  }

  async function upgrade(plan: PaidPlan) {
    setSelected(plan);
    setBusy(plan);
    setBanner(null);
    try {
      const session = await apiRequest<CheckoutSession>("POST", "/billing/subscriptions", { plan, billing: cycle });
      const outcome = await openSubscriptionCheckout({
        key: session.keyId,
        subscription_id: session.subscriptionId,
        name: "Global Aviation Services Directory",
        description: `${session.planName} plan — billed ${session.billing}`,
        prefill: {
          name: session.prefill.name,
          email: session.prefill.email,
          contact: session.prefill.contact || profile?.phone || "",
        },
        theme: { color: "#2f80ed" },
      });
      if (outcome.kind === "dismissed") {
        setBanner({
          tone: "info",
          title: "Checkout closed",
          body: "No payment was taken. You can upgrade whenever you're ready.",
        });
      } else if (outcome.kind === "failed") {
        setBanner({
          tone: "danger",
          title: "Payment failed",
          body: outcome.message,
        });
      } else {
        await apiRequest("POST", "/billing/subscriptions/verify", outcome.response);
        setBanner({
          tone: "success",
          title: `Welcome to ${session.planName}!`,
          body: "Your payment was confirmed and your listing has been upgraded.",
        });
      }
      refresh();
    } catch (err) {
      setBanner(explain(err));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBanner(null);
    try {
      const updated = await apiRequest<{ currentPeriodEnd: string | null }>("POST", "/billing/subscription/cancel");
      setBanner({
        tone: "success",
        title: "Cancellation scheduled",
        body: `Your plan stays active until ${updated.currentPeriodEnd ? formatDate(updated.currentPeriodEnd) : "the end of the current billing period"}, then your listing moves to Basic.`,
      });
      overview.reload();
    } catch (err) {
      setBanner(
        err instanceof ApiError && err.status === 503
          ? {
              tone: "warning",
              title: "Can't cancel online right now",
              body: `${err.body.message} Please contact us and we'll cancel it for you.`,
            }
          : {
              tone: "danger",
              title: "Couldn't cancel the subscription",
              body: err instanceof ApiError ? err.body.message : "Please try again.",
            },
      );
    }
  }

  const priceOf = (plan: PaidPlan) => {
    const p = plans.data?.find((x) => x.id === plan);
    const value = cycle === "yearly" ? p?.yearlyPrice : p?.monthlyPrice;
    return value === null || value === undefined ? null : `$${value}`;
  };
  const nameOf = (plan: PaidPlan) => plans.data?.find((x) => x.id === plan)?.name ?? TIER_LABEL[plan];

  const paymentColumns: Column<Payment>[] = [
    {
      key: "date",
      header: "Date",
      render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.paidAt)}</span>,
    },
    { key: "plan", header: "Plan", render: (p) => TIER_LABEL[p.plan] },
    {
      key: "amount",
      header: "Amount",
      render: (p) => <span className="font-semibold">{formatMoney(p.amount, p.currency)}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (p) => <span className="capitalize text-muted">{p.method ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusPill status={p.status} />,
    },
    {
      key: "ref",
      header: "Reference",
      render: (p) => <span className="font-mono text-xs text-muted">{p.razorpayPaymentId}</span>,
    },
  ];

  if (overview.error && overview.error.status !== 404) {
    return (
      <div>
        <PageHeader title="Plan & billing" />
        <ErrorPanel error={overview.error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Plan & billing" description="Upgrade your listing, manage your subscription and download your payment history." />

      {banner && (
        <div ref={bannerRef} className="scroll-mt-28">
          <Notice
            tone={banner.tone}
            title={banner.title}
            action={
              banner.action === "listing" ? (
                <ButtonLink href="/account/listing" size="sm">
                  Create your listing
                </ButtonLink>
              ) : undefined
            }
          >
            {banner.body}
          </Notice>
        </div>
      )}

      {noListing && !banner && (
        <Notice
          tone="info"
          title="You don't have a listing yet"
          action={
            <ButtonLink href="/account/listing" size="sm">
              Create your listing
            </ButtonLink>
          }
        >
          Plans apply to your company listing. Create it first, then choose Pro or Ultra Pro.
        </Notice>
      )}

      <Card title="Current plan">
        {overview.loading && !overview.data ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface" aria-busy="true" />
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className={cn("flex size-12 items-center justify-center rounded-2xl", tier === "basic" ? "bg-brand/8 text-brand" : "bg-warning/12 text-[#a16207]")}>
                {tier === "ultra_pro" ? <Crown className="size-6" aria-hidden /> : <Sparkles className="size-6" aria-hidden />}
              </span>
              <div>
                <p className="text-xl font-extrabold text-ink">{TIER_LABEL[tier]}</p>
                {sub ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <StatusPill status={sub.status} />
                    <span>
                      {TIER_LABEL[sub.plan]} · {formatMoney(sub.amount, sub.currency)} / {sub.billing === "yearly" ? "year" : "month"}
                    </span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted">Free forever. Upgrade to unlock enquiries, more photos and social links.</p>
                )}
                {sub && live && sub.currentPeriodEnd && (
                  <p className="mt-1 text-xs text-subtle">
                    {sub.cancelAtPeriodEnd
                      ? `Cancels on ${formatDate(sub.currentPeriodEnd)} — your listing then returns to Basic.`
                      : `Renews on ${formatDate(sub.currentPeriodEnd)}.`}
                  </p>
                )}
                {sub && !live && sub.endedAt && <p className="mt-1 text-xs text-subtle">Ended {formatDate(sub.endedAt)}.</p>}
              </div>
            </div>
            {live && sub && !sub.cancelAtPeriodEnd && (
              <div className="flex flex-col items-start gap-1 md:items-end">
                <ConfirmButton confirmLabel="Yes, cancel at period end" onConfirm={cancel}>
                  Cancel subscription
                </ConfirmButton>
                <span className="text-xs text-subtle">You keep your plan until the end of the paid period.</span>
              </div>
            )}
          </div>
        )}
      </Card>

      <section ref={plansRef} aria-labelledby="upgrade-heading" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="upgrade-heading" className="text-base font-bold text-ink">
              {live ? "Change plan" : "Upgrade your listing"}
            </h2>
            <p className="text-sm text-muted">
              {live ? "To switch plans, cancel your current subscription first; the new plan can start once it ends." : "Secure payment by Razorpay. Cancel anytime."}
            </p>
          </div>
          <div role="radiogroup" aria-label="Billing cycle" className="inline-flex self-start rounded-full bg-surface p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => setCycle(c)}
                className={cn("h-9 rounded-full px-4 text-sm font-semibold capitalize transition", cycle === c ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PAID.map((plan) => {
            const current = live && sub?.plan === plan;
            const price = priceOf(plan);
            return (
              <article
                key={plan}
                aria-labelledby={`plan-${plan}`}
                className={cn("flex flex-col rounded-2xl border-2 p-5 transition", selected === plan ? "border-brand shadow-card" : "border-line")}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 id={`plan-${plan}`} className={cn("text-lg font-bold", plan === "pro" ? "text-brand" : "text-[#a16207]")}>
                    {nameOf(plan)}
                  </h3>
                  {current && <StatusPill status="current" tone="green" />}
                  {!current && selected === plan && <StatusPill status="selected" tone="blue" />}
                </div>
                <p className="mt-2 flex items-end gap-1">
                  {price ? (
                    <>
                      <span className="text-3xl font-extrabold text-ink">{price}</span>
                      <span className="pb-1 text-sm text-subtle">/{cycle === "yearly" ? "year" : "month"}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">{plans.loading ? "Loading price…" : "Price shown at checkout"}</span>
                  )}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {UNLOCKS[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={plan === "pro" ? "primary" : "navy"}
                  loading={busy === plan}
                  disabled={busy !== null || live || noListing}
                  onClick={() => upgrade(plan)}
                >
                  {current ? "Your current plan" : `Upgrade to ${nameOf(plan)} · ${cycle}`}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="payments-heading">
        <h2 id="payments-heading" className="mb-3 text-base font-bold text-ink">
          Payment history
        </h2>
        {payments.error ? (
          <ErrorPanel error={payments.error} onRetry={payments.reload} />
        ) : (
          <>
            <DataTable
              columns={paymentColumns}
              rows={payments.data?.items}
              rowKey={(p) => p.id}
              loading={payments.loading}
              empty={
                <EmptyState
                  title="No payments yet"
                  description={`Payments for your ${user.role === "PROVIDER" ? "listing" : "account"} will appear here after your first upgrade.`}
                />
              }
            />
            {payments.data && payments.data.totalPages > 1 && <Pager page={payments.data.page} totalPages={payments.data.totalPages} total={payments.data.total} />}
          </>
        )}
      </section>
    </div>
  );
}
