"use client";

import { Eye, EyeOff, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon, ConfirmAction, DataTable, EmptyState, ErrorPanel, FilterBar, formatDateTime, Pager, RowActions, SearchFilter, SelectFilter, StatusPill, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/components/admin/enquiries/types";
import { ButtonLink } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { AD_PLACEMENTS, PLACEMENT_LABEL, SELECTABLE_PLACEMENTS, adState, type AdminAd, type PlacementStats, type PlacementTraffic } from "./schema";
import { siteUrl } from "@/components/admin/news/site";

const STATE_TONE = { active: "green", paused: "slate", scheduled: "blue", ended: "amber" } as const;
const pct = (n: number) => `${n.toFixed(2)}%`;

function PlacementStatsGrid({ stats, loading, traffic }: { stats: PlacementStats[] | null; loading: boolean; traffic: PlacementTraffic[] | null }) {
  if (loading && !stats) return <div className="mb-4 h-[76px] animate-pulse rounded-2xl bg-white/60" role="status" aria-label="Loading placement stats" />;
  if (!stats) return null;
  // Placements the website doesn't render (e.g. "inline") only appear if an ad still uses them.
  const shown = stats.filter((s) => SELECTABLE_PLACEMENTS.includes(s.placement) || s.ads > 0);
  return (
    <ul className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Placement performance">
      {shown.map((s) => {
        const t = traffic?.find((x) => x.placement === s.placement);
        return (
          <li key={s.placement} className="glass flex items-center gap-3 rounded-2xl border px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">{PLACEMENT_LABEL[s.placement]}</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-ink">{pct(s.ctr)}</span>
                <span className="text-[11px] text-muted">CTR</span>
              </p>
              {t && (
                <p className="truncate text-[11px] text-muted">
                  {t.liveAds} live · weight {t.totalWeight}
                </p>
              )}
            </div>
            <dl className="grid shrink-0 grid-cols-3 gap-3 text-right text-[11px]">
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
        );
      })}
    </ul>
  );
}

export function AdsList() {
  const router = useRouter();
  const { get, page, pageSize } = useUrlParams();
  const placement = (AD_PLACEMENTS as readonly string[]).includes(get("placement")) ? get("placement") : "";
  const active = ["true", "false"].includes(get("active")) ? get("active") : "";
  const q = get("q").trim();
  const list = useApi<Paginated<AdminAd>>(withQuery("/admin/ads", { page, pageSize, placement, active, q }));
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

  async function toggleActive(ad: AdminAd) {
    setFeedback(null);
    try {
      await apiRequest("PATCH", `/admin/ads/${ad.id}`, { active: !ad.active });
      setFeedback({ status: "success", message: ad.active ? `The ${ad.advertiser} ad is hidden on the site.` : `The ${ad.advertiser} ad is shown on the site.` });
      list.reload();
      stats.reload();
      traffic.reload();
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't update the ad." });
    }
  }

  const columns: Column<AdminAd>[] = [
    {
      key: "ad",
      header: "Ad",
      render: (a) => (
        <Link href={`/admin/ads/${a.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 font-semibold text-ink hover:text-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails may live on the API host */}
          <img src={siteUrl(a.image)} alt="" className="h-8 w-12 shrink-0 rounded-md bg-surface object-cover" />
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
      className: "w-px",
      render: (a) => (
        <RowActions>
          <ActionIcon icon={Pencil} label={`Edit ${a.advertiser} ad`} hint="Edit ad: image, link, schedule and weight" href={`/admin/ads/${a.id}`} />
          <ActionIcon
            icon={a.active ? EyeOff : Eye}
            label={a.active ? `Hide ${a.advertiser} ad` : `Show ${a.advertiser} ad`}
            hint={a.active ? "Hide: stop showing this ad on the site" : "Show: start showing this ad on the site"}
            tone={a.active ? "warning" : "success"}
            onClick={() => toggleActive(a)}
          />
          <ConfirmAction label={`Delete ${a.advertiser} ad`} hint="Delete this ad and its stats" confirmHint="Yes, delete this ad" onConfirm={() => remove(a)} />
        </RowActions>
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
