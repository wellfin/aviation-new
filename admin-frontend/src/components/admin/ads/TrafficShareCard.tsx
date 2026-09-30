"use client";

import { Card } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { PLACEMENT_LABEL, projectTraffic, type AdPlacement, type PlacementTraffic } from "./schema";

const PALETTE = ["bg-brand", "bg-purple", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-lime-500", "bg-slate-400"];
const fmt = (n: number) => `${n.toFixed(1)}%`;

/**
 * Right-hand panel of the ad editor: how the placement's views are split between the
 * live ads, including this ad with the weight/dates currently in the form (before saving).
 */
export function TrafficShareCard({
  placement,
  traffic,
  loading,
  adId,
  advertiser,
  weight,
  impressions,
  live,
  notLiveReason,
}: {
  placement: AdPlacement;
  traffic: PlacementTraffic | undefined;
  loading: boolean;
  adId?: string;
  advertiser: string;
  weight: number | null;
  impressions: number;
  live: boolean;
  notLiveReason: string;
}) {
  const candidate = live && weight !== null ? { advertiser: advertiser || "This ad", weight, impressions } : null;
  const { rows, totalWeight, thisShare, othersShare } = projectTraffic(traffic, adId, candidate);
  const colour = new Map(rows.map((r, i) => [r.id, r.isThis ? "bg-brand" : PALETTE[(i % (PALETTE.length - 1)) + 1]]));

  return (
    <Card title={`Traffic share — ${PLACEMENT_LABEL[placement]}`}>
      {loading && !traffic ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface" role="status" aria-label="Loading traffic share" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-brand/10 p-3">
              <p className="text-2xl font-extrabold text-brand">{fmt(thisShare)}</p>
              <p className="text-xs text-muted">This ad</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-2xl font-extrabold text-ink">{fmt(othersShare)}</p>
              <p className="text-xs text-muted">Other advertisers</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-2xl font-extrabold text-ink">{totalWeight}</p>
              <p className="text-xs text-muted">Total live weight</p>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface" aria-hidden>
              {rows.map((r) => (
                <span key={r.id} className={cn("h-full", colour.get(r.id))} style={{ width: `${r.share}%` }} />
              ))}
            </div>
          )}

          {!live && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{notLiveReason} It gets 0% of views; the other live ads share 100%.</p>}

          {rows.length === 0 ? (
            <p className="text-sm text-muted">No live ads in this placement yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Advertiser</th>
                  <th className="pb-2 text-right font-medium">Weight</th>
                  <th className="pb-2 text-right font-medium">Share</th>
                  <th className="pb-2 text-right font-medium">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("border-t border-line", r.isThis && "bg-brand/5 font-semibold")}>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2.5 shrink-0 rounded-full", colour.get(r.id))} aria-hidden />
                        <span className="truncate">{r.advertiser}</span>
                        {r.isThis && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">THIS AD</span>}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.weight}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.share)}</td>
                    <td className="py-2 text-right text-muted tabular-nums">{r.impressions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted">
            Share = weight ÷ total weight of the ads live now in this placement. Updates as you change the weight, dates or Active switch — save to apply.
          </p>
        </div>
      )}
    </Card>
  );
}
