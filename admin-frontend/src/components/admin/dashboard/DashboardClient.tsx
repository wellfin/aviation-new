"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarRange, Inbox, MessageSquareText } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, ErrorPanel, PageHeader, formatMoney } from "@/components/admin/ui";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { allowedIntervals, defaultInterval, isValidDay, RANGE_PRESETS, resolveRange, type Interval } from "./range";
import { TimeseriesChart, type SeriesPoint } from "./TimeseriesChart";

interface Overview {
  range: { from: string; to: string };
  users: { total: number; byRole: Record<string, number>; newInRange: number };
  providers: { total: number; byStatus: Record<string, number>; byTier: Record<string, number>; pendingListings: number };
  reviews: { pending: number; approved: number; rejected: number; total: number };
  enquiries: { inRange: number; byStatus: Record<string, number> };
  leads: { inRange: number; byType: Record<string, number> };
  newsletter: { subscribers: number; pending: number; unsubscribed: number };
  revenue: { byCurrency: Array<{ currency: string; amount: number; payments: number }> };
}

const METRICS = [
  { metric: "users", title: "New users", yLabel: "Sign-ups", kind: "bar" },
  { metric: "enquiries", title: "Enquiries", yLabel: "Enquiries", kind: "bar" },
  { metric: "reviews", title: "Reviews submitted", yLabel: "Reviews", kind: "bar" },
  { metric: "revenue", title: "Revenue (INR)", yLabel: "Revenue", kind: "line" },
] as const;

export function DashboardClient() {
  const { user } = useAuth();
  const { get, set } = useUrlParams();
  const range = resolveRange(get("range", "30d"), get("from"), get("to"));
  const intervals = allowedIntervals(range.days);
  const requested = get("interval") as Interval;
  const interval = intervals.includes(requested) ? requested : defaultInterval(range.days);

  const query = { from: range.from, to: range.to };
  const overview = useApi<Overview>(range.error ? null : withQuery("/admin/reports/overview", query));
  const o = overview.data;

  return (
    <>
      <PageHeader title="Dashboard" description={`Activity from ${fmtDay(range.from)} to ${fmtDay(range.to)} (UTC).`} />

      <RangePicker
        key={`${range.preset}:${range.from}:${range.to}`}
        preset={range.preset}
        from={range.from}
        to={range.to}
        interval={interval}
        intervals={intervals}
        onPreset={(value) => set({ range: value === "30d" ? "" : value, from: "", to: "" })}
        onCustom={(from, to) => set({ range: "custom", from, to })}
        onInterval={(value) => set({ interval: value === defaultInterval(range.days) ? "" : value })}
      />
      {range.error && (
        <p role="alert" className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {range.error}
        </p>
      )}

      {overview.error ? (
        <ErrorPanel error={overview.error} onRetry={overview.reload} />
      ) : (
        <>
          <section aria-label="Needs attention" className="mb-6 grid gap-3 md:grid-cols-3">
            {can(user, "providers:manage") && (
              <QuickLink href="/admin/providers?status=pending" icon={Building2} label="Listings awaiting review" value={o?.providers.pendingListings} />
            )}
            {can(user, "reviews:moderate") && (
              <QuickLink href="/admin/reviews" icon={MessageSquareText} label="Reviews awaiting moderation" value={o?.reviews.pending} />
            )}
            {can(user, "enquiries:read:any") && (
              <QuickLink href="/admin/enquiries?status=new" icon={Inbox} label="New enquiries in range" value={o?.enquiries.byStatus.new} />
            )}
          </section>

          <section aria-label="Key figures" aria-busy={overview.loading || undefined} className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Users" value={o?.users.total} sub={o && `+${o.users.newInRange.toLocaleString()} in range`} />
            <Kpi label="Published listings" value={o?.providers.byStatus.published} sub={o && `${o.providers.total.toLocaleString()} listings in total`} />
            <Kpi label="Enquiries" value={o?.enquiries.inRange} sub="in range" />
            <Kpi label="Leads" value={o?.leads.inRange} sub="in range" />
            <Kpi label="Reviews" value={o?.reviews.total} sub={o && `${o.reviews.approved.toLocaleString()} approved · ${o.reviews.rejected.toLocaleString()} rejected`} />
            <Kpi
              label="Newsletter subscribers"
              value={o?.newsletter.subscribers}
              sub={o && `${o.newsletter.pending.toLocaleString()} awaiting confirmation`}
            />
            <div className="col-span-2 rounded-2xl border border-line bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold tracking-[0.4px] text-muted uppercase">Revenue (captured, in range)</p>
              {!o ? (
                <span className="mt-2 block h-7 w-32 animate-pulse rounded bg-surface" />
              ) : o.revenue.byCurrency.length === 0 ? (
                <p className="mt-1 text-2xl font-extrabold text-ink">{formatMoney(0)}</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                  {o.revenue.byCurrency.map((r) => (
                    <li key={r.currency}>
                      <span className="text-2xl font-extrabold text-ink">{formatMoney(r.amount, r.currency)}</span>{" "}
                      <span className="text-xs text-muted">
                        {r.payments} payment{r.payments === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {o && (
            <section aria-label="Breakdowns" className="mb-6 grid gap-3 lg:grid-cols-3">
              <Breakdown title="Listings by status" rows={o.providers.byStatus} />
              <Breakdown title="Listings by tier" rows={o.providers.byTier} labels={{ basic: "Basic", pro: "Pro", ultra_pro: "Ultra Pro" }} />
              <Breakdown title="Users by role" rows={o.users.byRole} />
            </section>
          )}
        </>
      )}

      {!range.error && (
        <div className="grid gap-4 xl:grid-cols-2">
          {METRICS.map((m) => (
            <MetricChart key={m.metric} {...m} from={range.from} to={range.to} interval={interval} />
          ))}
        </div>
      )}
    </>
  );
}

function fmtDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function RangePicker({
  preset,
  from,
  to,
  interval,
  intervals,
  onPreset,
  onCustom,
  onInterval,
}: {
  preset: string;
  from: string;
  to: string;
  interval: Interval;
  intervals: Interval[];
  onPreset: (value: string) => void;
  onCustom: (from: string, to: string) => void;
  onInterval: (value: Interval) => void;
}) {
  const [showCustom, setShowCustom] = useState(preset === "custom");
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState("");

  function applyCustom(e: FormEvent) {
    e.preventDefault();
    if (!isValidDay(draft.from) || !isValidDay(draft.to)) return setError("Choose both dates.");
    if (draft.from > draft.to) return setError("The start date must be on or before the end date.");
    setError("");
    onCustom(draft.from, draft.to);
  }

  const chip = (active: boolean) =>
    cn("h-9 rounded-xl px-3 text-sm font-semibold transition", active ? "bg-navy-900 text-white" : "border border-line bg-white text-ink hover:bg-surface");

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-soft lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        <CalendarRange className="size-4 text-muted" aria-hidden />
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            className={chip(preset === p.value)}
            onClick={() => {
              setShowCustom(false);
              onPreset(p.value);
            }}
          >
            Last {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={preset === "custom"} aria-expanded={showCustom} className={chip(preset === "custom")} onClick={() => setShowCustom((s) => !s)}>
          Custom
        </button>
      </div>

      {showCustom && (
        <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-2" noValidate>
          <label className="text-xs font-semibold text-muted">
            From
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="mt-1 block h-9 rounded-xl border border-line px-2 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            To
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="mt-1 block h-9 rounded-xl border border-line px-2 text-sm text-ink"
            />
          </label>
          <button type="submit" className="h-9 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:brightness-110">
            Apply
          </button>
          {error && (
            <p role="alert" className="w-full text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </form>
      )}

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Group by</span>
        <select value={interval} onChange={(e) => onInterval(e.target.value as Interval)} className="h-9 rounded-xl border border-line bg-white px-3 text-sm">
          {intervals.map((i) => (
            <option key={i} value={i}>
              {i[0].toUpperCase() + i.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, value }: { href: string; icon: typeof Inbox; label: string; value: number | undefined }) {
  const hot = (value ?? 0) > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-soft transition hover:border-brand",
        hot ? "border-warning/50" : "border-line",
      )}
    >
      <span className={cn("flex size-11 items-center justify-center rounded-xl", hot ? "bg-warning/15 text-[#a16207]" : "bg-surface text-muted")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-extrabold text-ink">{value === undefined ? "…" : value.toLocaleString()}</span>
        <span className="block text-sm text-muted">{label}</span>
      </span>
      <ArrowRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
    </Link>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | undefined; sub?: string | undefined | null }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold tracking-[0.4px] text-muted uppercase">{label}</p>
      {value === undefined ? (
        <span className="mt-2 block h-7 w-16 animate-pulse rounded bg-surface" />
      ) : (
        <p className="mt-1 text-2xl font-extrabold text-ink">{value.toLocaleString()}</p>
      )}
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Breakdown({ title, rows, labels = {} }: { title: string; rows: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(rows);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <Card title={title}>
      <dl className="flex flex-col gap-2.5">
        {entries.map(([key, v]) => (
          <div key={key} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
            <dt className="truncate text-muted capitalize">{labels[key] ?? key.replace(/_/g, " ").toLowerCase()}</dt>
            <div className="h-2 rounded-full bg-surface" aria-hidden>
              <div className="h-2 rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <dd className="text-right font-semibold text-ink tabular-nums">{v.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function MetricChart({
  metric,
  title,
  yLabel,
  kind,
  from,
  to,
  interval,
}: {
  metric: string;
  title: string;
  yLabel: string;
  kind: "bar" | "line";
  from: string;
  to: string;
  interval: Interval;
}) {
  const series = useApi<SeriesPoint[]>(withQuery("/admin/reports/timeseries", { metric, interval, from, to }));
  const isMoney = metric === "revenue";
  const total = series.data?.reduce((a, p) => a + p.value, 0) ?? 0;
  return (
    <Card
      title={title}
      actions={series.data ? <span className="text-sm font-semibold text-ink tabular-nums">{isMoney ? formatMoney(total) : total.toLocaleString()} total</span> : undefined}
    >
      {series.error ? (
        <ErrorPanel error={series.error} onRetry={series.reload} />
      ) : !series.data ? (
        <div className="h-60 animate-pulse rounded-xl bg-surface" role="status" aria-label={`Loading ${title}`} />
      ) : (
        <div className={cn(series.loading && "opacity-60")}>
          <TimeseriesChart
            title={`${title} per ${interval}`}
            data={series.data}
            interval={interval}
            kind={kind}
            yLabel={yLabel}
            minAxisMax={isMoney ? 10_000 : 4}
            format={isMoney ? (v) => formatMoney(v) : undefined}
          />
        </div>
      )}
    </Card>
  );
}
