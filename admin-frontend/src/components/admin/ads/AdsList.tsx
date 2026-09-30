"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton, DataTable, EmptyState, ErrorPanel, FilterBar, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/components/admin/enquiries/types";
import { ButtonLink } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { AD_PLACEMENTS, PLACEMENT_LABEL, SELECTABLE_PLACEMENTS, adState, type AdminAd, type PlacementStats, type PlacementTraffic } from "./schema";
import { siteUrl } from "@/components/admin/news/site";

const PAGE_SIZE = 20;
const STATE_TONE = { active: "green", paused: "slate", scheduled: "blue", ended: "amber" } as const;
const pct = (n: number) => `${n.toFixed(2)}%`;

function PlacementStatsGrid({ stats, loading, traffic }: { stats: PlacementStats[] | null; loading: boolean; traffic: PlacementTraffic[] | null }) {
  if (loading && !stats) return <div className="mb-6 h-28 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading placement stats" />;
  if (!stats) return null;
  // Placements the website doesn't render (e.g. "inline") only appear if an ad still uses them.
  const shown = stats.filter((s) => SELECTABLE_PLACEMENTS.includes(s.placement) || s.ads > 0);
  return (
    <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Placement performance">
      {shown.map((s) => (
        <li key={s.placement} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">{PLACEMENT_LABEL[s.placement]}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{pct(s.ctr)}</p>
          <p className="text-xs text-muted">CTR</p>
          {(() => {
            const t = traffic?.find((x) => x.placement === s.placement);
            return t ? (
              <p className="mt-2 text-xs text-muted">
                Live now: <span className="font-semibold text-ink">{t.liveAds}</span> ad{t.liveAds === 1 ? "" : "s"} · total weight <span className="font-semibold text-ink">{t.totalWeight}</span>
              </p>
            ) : null;
          })()}
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-subtle">Ads</dt>
              <dd className="font-semibold text-ink">
                {s.activeAds}/{s.ads}
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Views</dt>
              <dd className="font-semibold text-ink">{s.impressions.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-subtle">Clicks</dt>
              <dd className="font-semibold text-ink">{s.clicks.toLocaleString()}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export function AdsList() {
  const router = useRouter();
  const { get, page } = useUrlParams();
  const placement = (AD_PLACEMENTS as readonly string[]).includes(get("placement")) ? get("placement") : "";
  const active = ["true", "false"].includes(get("active")) ? get("active") : "";
  const q = get("q").trim();
  const list = useApi<Paginated<AdminAd>>(withQuery("/admin/ads", { page, pageSize: PAGE_SIZE, placement, active, q }));
  const stats = useApi<PlacementStats[]>("/admin/ads/stats");
  const traffic = useApi<PlacementTraffic[]>("/admin/ads/traffic");
  const shareById = new Map((traffic.data ?? []).flatMap((t) => t.ads.map((a) => [a.id, { share: a.share, total: t.totalWeight }] as const)));
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const filtered = Boolean(placement || active || q);

  async function remove(ad: AdminAd) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/ads/${ad.id}`);
      setFeedback({ status: "success", message: `Deleted the ${ad.advertiser} ad.` });
      list.reload();
      stats.reload();
      traffic.reload();
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete the ad." });
    }
  }

  const columns: Column<AdminAd>[] = [
    {
      key: "ad",
      header: "Ad",
      render: (a) => (
        <Link href={`/admin/ads/${a.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 font-semibold text-ink hover:text-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails may live on the API host */}
          <img src={siteUrl(a.image)} alt="" className="h-9 w-14 shrink-0 rounded-md bg-surface object-cover" />
          <span className="min-w-0">
            {a.advertiser}
            <span className="block max-w-64 truncate text-xs font-normal text-muted">{a.headline ?? a.href}</span>
          </span>
        </Link>
      ),
    },
    { key: "placement", header: "Placement", render: (a) => <span className="whitespace-nowrap">{PLACEMENT_LABEL[a.placement]}</span> },
    {
      key: "state",
      header: "Status",
      render: (a) => {
        const s = adState(a);
        return <StatusPill status={s} tone={STATE_TONE[s]} />;
      },
    },
    {
      key: "window",
      header: "Schedule",
      render: (a) => (
        <span className="text-xs whitespace-nowrap text-muted">
          {a.startsAt || a.endsAt ? (
            <>
              {a.startsAt ? formatDateTime(a.startsAt) : "Now"}
              <br />→ {a.endsAt ? formatDateTime(a.endsAt) : "No end"}
            </>
          ) : (
            "Always on"
          )}
        </span>
      ),
    },
    { key: "weight", header: "Weight", render: (a) => a.weight, className: "text-right" },
    {
      key: "share",
      header: "Traffic share",
      className: "text-right",
      render: (a) => {
        const s = shareById.get(a.id);
        if (!s) return <span className="text-xs text-subtle" title="Not live now (paused, scheduled or ended), so it gets no views">—</span>;
        return (
          <span className="inline-flex flex-col items-end gap-1" title={`${a.weight} of ${s.total} total live weight`}>
            <span className="font-semibold text-ink">{s.share.toFixed(1)}%</span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface" aria-hidden>
              <span className="block h-full rounded-full bg-brand" style={{ width: `${s.share}%` }} />
            </span>
          </span>
        );
      },
    },
    { key: "impr", header: "Impressions", render: (a) => a.impressions.toLocaleString(), className: "text-right" },
    { key: "clicks", header: "Clicks", render: (a) => a.clicks.toLocaleString(), className: "text-right" },
    { key: "ctr", header: "CTR", render: (a) => <span className="font-semibold">{pct(a.ctr)}</span>, className: "text-right" },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <span onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <ConfirmButton onConfirm={() => remove(a)} confirmLabel="Delete">
            Delete
          </ConfirmButton>
        </span>
      ),
    },
  ];

  return (
    <>
      <PlacementStatsGrid stats={stats.data} loading={stats.loading} traffic={traffic.data} />
      <FilterBar>
        <SearchFilter placeholder="Advertiser or headline" label="Search ads" />
        <SelectFilter param="placement" label="Placement" options={SELECTABLE_PLACEMENTS.map((p) => ({ value: p, label: PLACEMENT_LABEL[p] }))} />
        <SelectFilter param="active" label="Active" options={[{ value: "true", label: "Active" }, { value: "false", label: "Paused" }]} />
      </FilterBar>
      {feedback && (
        <div className="mb-4" aria-live="polite">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {list.error ? (
        <ErrorPanel error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data?.items}
            rowKey={(a) => a.id}
            loading={list.loading}
            onRowClick={(a) => router.push(`/admin/ads/${a.id}`)}
            empty={
              filtered ? (
                <EmptyState title="No ads match" description="Try changing the filters." />
              ) : (
                <EmptyState title="No ads yet" description="Create an ad to fill a placement on the site." action={<ButtonLink href="/admin/ads/new" size="sm" className="mt-2">New ad</ButtonLink>} />
              )
            }
          />
          {list.data && list.data.total > 0 && <Pager page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} />}
        </>
      )}
    </>
  );
}
