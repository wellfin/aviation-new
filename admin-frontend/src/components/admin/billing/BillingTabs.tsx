"use client";

import { DataTable, EmptyState, ErrorPanel, FilterBar, Pager, SelectFilter, StatusPill, formatDateTime, formatMoney, type Column } from "@/components/admin/ui";
import { DateRangeFilter, dateParam, isInvertedRange } from "@/components/admin/enquiries/DateRangeFilter";
import type { Paginated } from "@/components/admin/enquiries/types";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { siteUrl } from "@/components/admin/news/site";

const SUBSCRIPTION_STATUSES = ["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"] as const;
const PAYMENT_STATUSES = ["authorized", "captured", "failed", "refunded"] as const;
const PAID_PLANS = ["pro", "ultra_pro"] as const;
const PLAN_LABEL: Record<string, string> = { pro: "Pro", ultra_pro: "Ultra Pro" };
const PAGE_SIZE = 20;

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const oneOf = (list: readonly string[], v: string) => (list.includes(v) ? v : "");

interface PersonRef {
  id: string;
  name: string;
  email: string;
}
interface ListingRef {
  id: string;
  name: string;
  slug: string;
  tier: string;
}

interface AdminSubscription {
  id: string;
  providerId: string;
  plan: string;
  billing: "monthly" | "yearly";
  status: string;
  /** Smallest currency unit (paise). */
  amount: number;
  currency: string;
  razorpaySubscriptionId: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  endedAt: string | null;
  createdAt: string;
  user: PersonRef | null;
  listing: ListingRef | null;
}

interface AdminPayment {
  id: string;
  subscriptionId: string;
  plan: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  paidAt: string;
  user: PersonRef | null;
  listing: ListingRef | null;
  errorDescription: string | null;
}

interface PaymentsPage extends Paginated<AdminPayment> {
  totals: Array<{ currency: string; capturedAmount: number; capturedCount: number }>;
}

function Party({ listing, user }: { listing: ListingRef | null; user: PersonRef | null }) {
  return (
    <span className="block min-w-44">
      {listing ? (
        <a href={siteUrl(`/providers/${listing.slug}`)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-brand">
          {listing.name}
        </a>
      ) : (
        <span className="font-semibold text-subtle">Deleted listing</span>
      )}
      <span className="block text-xs text-muted">{user ? `${user.name} · ${user.email}` : "Deleted user"}</span>
    </span>
  );
}

const TABS = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "payments", label: "Payments" },
] as const;

export function BillingTabs() {
  const { get, set } = useUrlParams();
  const tab = get("tab") === "payments" ? "payments" : "subscriptions";

  return (
    <>
      <nav aria-label="Billing sections" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            // Each tab has its own filters, so switching starts clean.
            onClick={() => set({ tab: t.id === "subscriptions" ? "" : t.id, status: "", plan: "", from: "", to: "" })}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "payments" ? <Payments /> : <Subscriptions />}
    </>
  );
}

function Subscriptions() {
  const { get, page } = useUrlParams();
  const status = oneOf(SUBSCRIPTION_STATUSES, get("status"));
  const plan = oneOf(PAID_PLANS, get("plan"));
  const { data, error, loading, reload } = useApi<Paginated<AdminSubscription>>(withQuery("/admin/billing/subscriptions", { page, pageSize: PAGE_SIZE, status, plan }));

  const columns: Column<AdminSubscription>[] = [
    { key: "who", header: "Listing / account", render: (s) => <Party listing={s.listing} user={s.user} /> },
    {
      key: "plan",
      header: "Plan",
      render: (s) => (
        <span className="whitespace-nowrap">
          {PLAN_LABEL[s.plan] ?? s.plan}
          <span className="block text-xs text-muted capitalize">{s.billing}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <span className="flex flex-col items-start gap-1">
          <StatusPill status={s.status} />
          {s.cancelAtPeriodEnd && <span className="text-xs whitespace-nowrap text-warning">Cancels at period end</span>}
        </span>
      ),
    },
    { key: "amount", header: "Amount", render: (s) => <span className="font-semibold whitespace-nowrap">{formatMoney(s.amount, s.currency)}</span>, className: "text-right" },
    {
      key: "period",
      header: "Current period",
      render: (s) => (
        <span className="text-xs whitespace-nowrap text-muted">
          {s.currentPeriodStart || s.currentPeriodEnd ? (
            <>
              {formatDateTime(s.currentPeriodStart)}
              <br />→ {formatDateTime(s.currentPeriodEnd)}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    { key: "rzp", header: "Razorpay id", render: (s) => <span className="font-mono text-xs text-muted">{s.razorpaySubscriptionId}</span> },
    { key: "created", header: "Created", render: (s) => <span className="whitespace-nowrap text-muted">{formatDateTime(s.createdAt)}</span> },
  ];

  return (
    <>
      <FilterBar>
        <SelectFilter param="status" label="Status" options={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
        <SelectFilter param="plan" label="Plan" options={PAID_PLANS.map((p) => ({ value: p, label: PLAN_LABEL[p] }))} />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            rowKey={(s) => s.id}
            loading={loading}
            empty={<EmptyState title="No subscriptions" description={status || plan ? "Try changing the filters." : "Paid subscriptions will appear here once providers upgrade."} />}
          />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}

function Payments() {
  const { get, page } = useUrlParams();
  const status = oneOf(PAYMENT_STATUSES, get("status"));
  const from = dateParam(get("from"));
  const to = dateParam(get("to"));
  const inverted = isInvertedRange(from, to);
  const { data, error, loading, reload } = useApi<PaymentsPage>(inverted ? null : withQuery("/admin/billing/payments", { page, pageSize: PAGE_SIZE, status, from, to }));

  const columns: Column<AdminPayment>[] = [
    { key: "paid", header: "Date", render: (p) => <span className="whitespace-nowrap text-muted">{formatDateTime(p.paidAt)}</span> },
    { key: "who", header: "Listing / account", render: (p) => <Party listing={p.listing} user={p.user} /> },
    { key: "plan", header: "Plan", render: (p) => PLAN_LABEL[p.plan] ?? p.plan },
    { key: "amount", header: "Amount", render: (p) => <span className="font-semibold whitespace-nowrap">{formatMoney(p.amount, p.currency)}</span>, className: "text-right" },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span className="flex flex-col items-start gap-1">
          <StatusPill status={p.status} />
          {p.errorDescription && <span className="max-w-56 text-xs text-danger">{p.errorDescription}</span>}
        </span>
      ),
    },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method ?? "—"}</span> },
    { key: "rzp", header: "Razorpay id", render: (p) => <span className="font-mono text-xs text-muted">{p.razorpayPaymentId}</span> },
  ];

  return (
    <>
      <FilterBar>
        <SelectFilter param="status" label="Status" options={PAYMENT_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
        <DateRangeFilter label="Paid" />
      </FilterBar>
      {data && !inverted && (
        <ul className="mb-4 flex flex-wrap gap-3" aria-label="Captured revenue">
          {data.totals.length === 0 ? (
            <li className="rounded-2xl border border-line bg-white px-5 py-4 shadow-soft">
              <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">Captured revenue</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{formatMoney(0)}</p>
              <p className="text-xs text-muted">No captured payments{from || to ? " in this period" : ""}</p>
            </li>
          ) : (
            data.totals.map((t) => (
              <li key={t.currency} className="rounded-2xl border border-line bg-white px-5 py-4 shadow-soft">
                <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">Captured revenue · {t.currency}</p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{formatMoney(t.capturedAmount, t.currency)}</p>
                <p className="text-xs text-muted">
                  {t.capturedCount.toLocaleString()} payment{t.capturedCount === 1 ? "" : "s"}
                  {from || to ? " in this period" : " all time"}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={inverted ? [] : data?.items}
            rowKey={(p) => p.id}
            loading={loading}
            empty={<EmptyState title="No payments" description={status || from || to ? "Try changing the filters." : "Payments appear here as Razorpay reports them."} />}
          />
          {data && !inverted && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
