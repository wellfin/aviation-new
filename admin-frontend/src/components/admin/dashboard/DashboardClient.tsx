"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, CalendarRange, FileText, Inbox, Megaphone, MessageSquareText } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Card, Dropdown, ErrorPanel, PageHeader, StatusPill, formatDateTime, formatMoney } from "@/components/admin/ui";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { BarList, Legend, LineChart, SegmentBar, SERIES_COLORS, Sparkline } from "./charts";
import { allowedIntervals, defaultInterval, isValidDay, RANGE_PRESETS, resolveRange, type Interval } from "./range";
import type { SeriesPoint } from "./TimeseriesChart";

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

interface Insights {
  enquiriesByCategory: Array<{ category: string; count: number }>;
  topProviders: Array<{ id: string; name: string; slug: string; category: string; enquiries: number; rating: number; reviews: number }>;
  listingsByCategory: Array<{ category: string; count: number }>;
  topAirports: Array<{ icao: string; name: string; city: string; listings: number }>;
  ads: { impressions: number; clicks: number; ctr: number; live: number; total: number };
  recentEnquiries: Array<{ id: string; name: string; provider: string; service: string; status: string; createdAt: string }>;
  recentLeads: Array<{ id: string; type: string; name: string; company: string; status: string; createdAt: string }>;
}

// Listing status: status colours (each shown with its label).
const STATUS_PARTS = [
  { key: "published", label: "Published", color: "#0ca30c" },
  { key: "pending", label: "Pending", color: "#fab219" },
  { key: "draft", label: "Draft", color: "#94a3b8" },
  { key: "rejected", label: "Rejected", color: "#e34948" },
  { key: "suspended", label: "Suspended", color: "#475569" },
];
const TIER_PARTS = [
  { key: "basic", label: "Basic", color: SERIES_COLORS[0] },
  { key: "pro", label: "Pro", color: SERIES_COLORS[1] },
  { key: "ultra_pro", label: "Ultra Pro", color: SERIES_COLORS[2] },
];
const LEAD_LABEL: Record<string, string> = { contact: "Contact", demo: "Demo", data_licence: "Data licence", advertising: "Advertising" };

function useSeries(metric: string, interval: Interval, from: string, to: string, enabled: boolean) {
  return useApi<SeriesPoint[]>(enabled ? withQuery("/admin/reports/timeseries", { metric, interval, from, to }) : null);
}

const total = (s: SeriesPoint[] | null | undefined) => s?.reduce((a, p) => a + p.value, 0) ?? 0;

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardClient() {
  const { user } = useAuth();
  const { get, set } = useUrlParams();
  const range = resolveRange(get("range", "30d"), get("from"), get("to"));
  const intervals = allowedIntervals(range.days);
  const requested = get("interval") as Interval;
  const interval = intervals.includes(requested) ? requested : defaultInterval(range.days);
  const ok = !range.error;

  const query = { from: range.from, to: range.to };
  const overview = useApi<Overview>(ok ? withQuery("/admin/reports/overview", query) : null);
  const insights = useApi<Insights>(ok ? withQuery("/admin/reports/insights", query) : null);
  const users = useSeries("users", interval, range.from, range.to, ok);
  const enquiries = useSeries("enquiries", interval, range.from, range.to, ok);
  const leads = useSeries("leads", interval, range.from, range.to, ok);
  const reviews = useSeries("reviews", interval, range.from, range.to, ok);
  const listings = useSeries("listings", interval, range.from, range.to, ok);
  const revenue = useSeries("revenue", interval, range.from, range.to, ok);
  const o = overview.data;
  const ins = insights.data;
  const inr = o?.revenue.byCurrency.find((r) => r.currency === "INR");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${greeting()}, ${user?.firstName ?? ""} · ${fmtDay(range.from)} – ${fmtDay(range.to)} (UTC)`}
        actions={
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
        }
      />
      {range.error && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {range.error}
        </p>
      )}

      {overview.error ? (
        <ErrorPanel error={overview.error} onRetry={overview.reload} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Needs attention */}
          <section aria-label="Needs attention" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {can(user, "providers:manage") && <Attention href="/admin/providers?status=pending" icon={Building2} label="Listings awaiting review" value={o?.providers.pendingListings} />}
            {can(user, "reviews:moderate") && <Attention href="/admin/reviews" icon={MessageSquareText} label="Reviews to moderate" value={o?.reviews.pending} />}
            {can(user, "enquiries:read:any") && <Attention href="/admin/enquiries?status=new" icon={Inbox} label="New enquiries in range" value={o?.enquiries.byStatus.new} />}
            {can(user, "leads:read") && <Attention href="/admin/leads" icon={FileText} label="Leads in range" value={o?.leads.inRange} />}
          </section>

          {/* Key figures with trend */}
          <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="New users" value={o?.users.newInRange} sub={o && `${o.users.total.toLocaleString()} accounts in total`} trend={users.data} color={SERIES_COLORS[2]} />
            <Stat label="Enquiries" value={o?.enquiries.inRange} sub={o && `${(o.enquiries.byStatus.replied ?? 0).toLocaleString()} replied`} trend={enquiries.data} color={SERIES_COLORS[0]} />
            <Stat label="Leads" value={o?.leads.inRange} sub="contact, demo, data, ads" trend={leads.data} color={SERIES_COLORS[1]} />
            <Stat label="New listings" value={listings.data ? total(listings.data) : undefined} sub={o && `${(o.providers.byStatus.published ?? 0).toLocaleString()} published of ${o.providers.total.toLocaleString()}`} trend={listings.data} color={SERIES_COLORS[0]} />
            <Stat label="Reviews" value={reviews.data ? total(reviews.data) : undefined} sub={o && `${o.reviews.approved.toLocaleString()} approved overall`} trend={reviews.data} color={SERIES_COLORS[2]} />
            <Stat
              label="Revenue"
              value={o ? (inr?.amount ?? 0) : undefined}
              display={(v) => formatMoney(v)}
              sub={o && `${(inr?.payments ?? 0).toLocaleString()} payment${inr?.payments === 1 ? "" : "s"} · ${o.newsletter.subscribers.toLocaleString()} subscribers`}
              trend={revenue.data}
              color={SERIES_COLORS[1]}
            />
          </section>

          {/* Activity + listings mix */}
          <section className="grid gap-4 xl:grid-cols-3">
            <Card
              title="Activity"
              className="xl:col-span-2"
              actions={
                <Legend
                  items={[
                    { label: "Enquiries", color: SERIES_COLORS[0], value: total(enquiries.data).toLocaleString() },
                    { label: "Leads", color: SERIES_COLORS[1], value: total(leads.data).toLocaleString() },
                    { label: "New users", color: SERIES_COLORS[2], value: total(users.data).toLocaleString() },
                  ]}
                />
              }
            >
              {enquiries.data && leads.data && users.data ? (
                <LineChart
                  title={`Enquiries, leads and new users per ${interval}`}
                  interval={interval}
                  height={380}
                  series={[
                    { key: "enquiries", label: "Enquiries", color: SERIES_COLORS[0], points: enquiries.data },
                    { key: "leads", label: "Leads", color: SERIES_COLORS[1], points: leads.data },
                    { key: "users", label: "New users", color: SERIES_COLORS[2], points: users.data },
                  ]}
                />
              ) : (
                <Skeleton h="h-[380px]" />
              )}
            </Card>

            <Card title="Listings">
              {!o ? (
                <Skeleton h="h-[260px]" />
              ) : (
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="mb-2 flex items-baseline justify-between text-[13px]">
                      <span className="font-semibold text-ink">By status</span>
                      <span className="text-muted">{o.providers.total.toLocaleString()} total</span>
                    </p>
                    <SegmentBar parts={STATUS_PARTS.map((p) => ({ label: p.label, color: p.color, value: o.providers.byStatus[p.key] ?? 0 }))} />
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-ink">By plan</p>
                    <SegmentBar parts={TIER_PARTS.map((p) => ({ label: p.label, color: p.color, value: o.providers.byTier[p.key] ?? 0 }))} />
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-ink">Accounts by role</p>
                    <BarList
                      rows={[
                        { key: "USER", label: "Website users", value: o.users.byRole.USER ?? 0 },
                        { key: "PROVIDER", label: "Providers", value: o.users.byRole.PROVIDER ?? 0 },
                        { key: "MANAGER", label: "Staff", value: o.users.byRole.MANAGER ?? 0 },
                        { key: "ADMIN", label: "Admins", value: o.users.byRole.ADMIN ?? 0 },
                      ]}
                    />
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Where demand goes */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card title="Enquiries by service" actions={<Hint>in range</Hint>}>
              {ins ? <BarList rows={ins.enquiriesByCategory.slice(0, 7).map((r) => ({ key: r.category, label: r.category, value: r.count }))} /> : <Skeleton h="h-52" />}
            </Card>
            <Card title="Listings by service" actions={<Hint>published</Hint>}>
              {ins ? <BarList color={SERIES_COLORS[2]} rows={ins.listingsByCategory.slice(0, 7).map((r) => ({ key: r.category, label: r.category, value: r.count }))} /> : <Skeleton h="h-52" />}
            </Card>
            <Card title="Top airports" actions={<Hint>by listings</Hint>}>
              {ins ? (
                <BarList
                  color={SERIES_COLORS[1]}
                  rows={ins.topAirports.slice(0, 7).map((a) => ({ key: a.icao, label: <span className="font-mono text-xs font-semibold">{a.icao}</span>, sub: a.city || a.name, value: a.listings }))}
                  empty="No airports linked to listings yet."
                />
              ) : (
                <Skeleton h="h-52" />
              )}
            </Card>
          </section>

          {/* Top listings + ads */}
          <section className="grid gap-4 xl:grid-cols-3">
            <Card title="Top listings by enquiries" className="xl:col-span-2" actions={<Hint>in range</Hint>}>
              {!ins ? (
                <Skeleton h="h-60" />
              ) : ins.topProviders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No enquiries in this range.</p>
              ) : (
                <MiniTable
                  head={["#", "Listing", "Service", "Enquiries", "Rating"]}
                  align={["left", "left", "left", "right", "right"]}
                  rows={ins.topProviders.map((p, i) => {
                    const max = ins.topProviders[0]!.enquiries || 1;
                    return [
                      <span key="r" className="text-muted tabular-nums">{i + 1}</span>,
                      <Link key="n" href={`/admin/providers/${p.id}`} className="font-semibold text-ink hover:text-brand">
                        {p.name}
                      </Link>,
                      <span key="c" className="text-muted">{p.category}</span>,
                      <span key="e" className="inline-flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-20 rounded-full bg-ink/[0.06] sm:block">
                          <span className="block h-1.5 rounded-full" style={{ width: `${(p.enquiries / max) * 100}%`, background: SERIES_COLORS[0] }} />
                        </span>
                        <span className="font-semibold tabular-nums">{p.enquiries}</span>
                      </span>,
                      <span key="s" className="tabular-nums">
                        ★ {p.rating.toFixed(1)} <span className="text-muted">({p.reviews})</span>
                      </span>,
                    ];
                  })}
                />
              )}
            </Card>

            <Card title="Advertising" actions={can(user, "ads:manage") ? <MoreLink href="/admin/ads" /> : undefined}>
              {!ins ? (
                <Skeleton h="h-60" />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-xl bg-brand/[0.06] p-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand shadow-soft">
                      <Megaphone className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xl font-extrabold text-ink tabular-nums">{ins.ads.ctr.toFixed(2)}%</p>
                      <p className="text-xs text-muted">Click-through rate (all time)</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Views" value={ins.ads.impressions.toLocaleString("en-IN")} />
                    <MiniStat label="Clicks" value={ins.ads.clicks.toLocaleString("en-IN")} />
                    <MiniStat label="Live ads" value={`${ins.ads.live}/${ins.ads.total}`} />
                  </dl>
                  {o && (
                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-ink">Leads by type</p>
                      <BarList color={SERIES_COLORS[1]} rows={Object.entries(o.leads.byType).map(([k, v]) => ({ key: k, label: LEAD_LABEL[k] ?? k, value: v }))} empty="No leads in this range." />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </section>

          {/* Revenue + reviews over time */}
          <section className="grid gap-4 xl:grid-cols-2">
            <Card title="Revenue" actions={<span className="text-sm font-semibold text-ink tabular-nums">{formatMoney(total(revenue.data))}</span>}>
              {revenue.data ? (
                <LineChart title={`Revenue (INR) per ${interval}`} interval={interval} height={220} minMax={1_000_00} format={(v) => formatMoney(v)} series={[{ key: "revenue", label: "Revenue", color: SERIES_COLORS[0], points: revenue.data }]} />
              ) : (
                <Skeleton h="h-[220px]" />
              )}
            </Card>
            <Card title="Reviews submitted" actions={<span className="text-sm font-semibold text-ink tabular-nums">{total(reviews.data).toLocaleString()}</span>}>
              {reviews.data ? (
                <LineChart title={`Reviews per ${interval}`} interval={interval} height={220} series={[{ key: "reviews", label: "Reviews", color: SERIES_COLORS[2], points: reviews.data }]} />
              ) : (
                <Skeleton h="h-[220px]" />
              )}
            </Card>
          </section>

          {/* Latest activity */}
          {ins && (ins.recentEnquiries.length > 0 || ins.recentLeads.length > 0 || can(user, "enquiries:read:any") || can(user, "leads:read")) && (
            <section className="grid gap-4 xl:grid-cols-2">
              {can(user, "enquiries:read:any") && (
                <Card title="Latest enquiries" actions={<MoreLink href="/admin/enquiries" />}>
                  {ins.recentEnquiries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">No enquiries yet.</p>
                  ) : (
                    <MiniTable
                      head={["From", "Listing", "Status", "Received"]}
                      align={["left", "left", "left", "right"]}
                      rows={ins.recentEnquiries.map((e) => [
                        <Link key="n" href={`/admin/enquiries/${e.id}`} className="font-semibold text-ink hover:text-brand">
                          {e.name}
                        </Link>,
                        <span key="p" className="block max-w-48 truncate text-muted">{e.provider}</span>,
                        <StatusPill key="s" status={e.status} />,
                        <span key="d" className="whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</span>,
                      ])}
                    />
                  )}
                </Card>
              )}
              {can(user, "leads:read") && (
                <Card title="Latest leads" actions={<MoreLink href="/admin/leads" />}>
                  {ins.recentLeads.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">No leads yet.</p>
                  ) : (
                    <MiniTable
                      head={["Name", "Type", "Status", "Received"]}
                      align={["left", "left", "left", "right"]}
                      rows={ins.recentLeads.map((l) => [
                        <Link key="n" href={`/admin/leads/${l.id}`} className="font-semibold text-ink hover:text-brand">
                          {l.name}
                          {l.company && <span className="ml-1.5 text-xs font-normal text-muted">{l.company}</span>}
                        </Link>,
                        <span key="t" className="text-muted">{LEAD_LABEL[l.type] ?? l.type}</span>,
                        <StatusPill key="s" status={l.status} />,
                        <span key="d" className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</span>,
                      ])}
                    />
                  )}
                </Card>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function fmtDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Skeleton({ h }: { h: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/60", h)} role="status" aria-label="Loading" />;
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted">{children}</span>;
}

function MoreLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
      View all <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 px-2 py-2.5">
      <dd className="text-base font-bold text-ink tabular-nums">{value}</dd>
      <dt className="text-[11px] text-muted">{label}</dt>
    </div>
  );
}

function MiniTable({ head, rows, align }: { head: string[]; rows: ReactNode[][]; align: Array<"left" | "right"> }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="border-y border-line bg-white/40 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("px-3 py-2 first:pl-5 last:pr-5", align[i] === "right" && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((r, i) => (
            <tr key={i} className="transition hover:bg-brand/[0.03]">
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 py-2 text-ink first:pl-5 last:pr-5", align[j] === "right" && "text-right")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Attention({ href, icon: Icon, label, value }: { href: string; icon: typeof Inbox; label: string; value: number | undefined }) {
  const hot = (value ?? 0) > 0;
  return (
    <Link href={href} className={cn("glass group flex items-center gap-3 rounded-2xl border p-3.5 transition hover:-translate-y-px", hot && "ring-1 ring-warning/50")}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", hot ? "bg-warning/15 text-[#a16207]" : "bg-brand/10 text-brand")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl leading-6 font-extrabold text-ink tabular-nums">{value === undefined ? "…" : value.toLocaleString()}</span>
        <span className="block truncate text-xs text-muted">{label}</span>
      </span>
      <ArrowRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  trend,
  color,
  display = (v) => v.toLocaleString("en-IN"),
}: {
  label: string;
  value: number | undefined;
  sub?: string | null | undefined;
  trend: SeriesPoint[] | null | undefined;
  color: string;
  display?: (v: number) => string;
}) {
  return (
    <div className="glass flex min-w-0 flex-col gap-2 rounded-2xl border p-4">
      <p className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">{label}</p>
      <div className="flex items-end justify-between gap-2">
        {value === undefined ? <span className="block h-7 w-16 animate-pulse rounded bg-white/70" /> : <p className="text-2xl leading-7 font-extrabold text-ink tabular-nums">{display(value)}</p>}
        <Sparkline points={trend} color={color} />
      </div>
      {sub && <p className="truncate text-xs text-muted">{sub}</p>}
    </div>
  );
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

  const seg = (active: boolean) => cn("rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", active ? "bg-white text-ink shadow-[0_1px_3px_rgba(11,31,58,0.12)]" : "text-muted hover:text-ink");

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-0.5 rounded-xl bg-ink/[0.04] p-1 ring-1 ring-line/80" role="group" aria-label="Date range">
        <CalendarRange className="mx-1.5 size-4 text-muted" aria-hidden />
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            className={seg(preset === p.value)}
            onClick={() => {
              setShowCustom(false);
              onPreset(p.value);
            }}
          >
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={preset === "custom"} aria-expanded={showCustom} className={seg(preset === "custom")} onClick={() => setShowCustom((s) => !s)}>
          Custom
        </button>
      </div>
      <Dropdown label="Group by" value={interval} options={intervals.map((i) => ({ value: i, label: i[0]!.toUpperCase() + i.slice(1) }))} onChange={(v) => onInterval(v as Interval)} />
      {showCustom && (
        <form onSubmit={applyCustom} className="flex w-full flex-wrap items-end justify-end gap-2" noValidate>
          <label className="text-xs font-semibold text-muted">
            From
            <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="mt-1 block h-9 rounded-xl border border-line bg-white px-2 text-sm text-ink" />
          </label>
          <label className="text-xs font-semibold text-muted">
            To
            <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="mt-1 block h-9 rounded-xl border border-line bg-white px-2 text-sm text-ink" />
          </label>
          <button type="submit" className="h-9 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:brightness-110">
            Apply
          </button>
          {error && (
            <p role="alert" className="w-full text-right text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
