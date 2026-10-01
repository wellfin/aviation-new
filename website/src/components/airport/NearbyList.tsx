import Link from "next/link";
import type { NearbyAirport } from "@/lib/types";
import { KM_TO_NM, formatNumber } from "@/lib/utils";

/** Nearby Airport tab: 88px row cards with the ICAO tile, name and a "View →" button (Figma 908:1661). */
export function NearbyList({ results, radiusKm }: { results: NearbyAirport[]; radiusKm: number }) {
  if (results.length === 0) {
    return (
      <p className="rounded-[20px] bg-white p-6 text-sm text-muted shadow-card">
        No other listed airports within {formatNumber(radiusKm)} km. Try the{" "}
        <Link href="/airports" className="font-semibold text-brand hover:underline">
          airport directory
        </Link>
        .
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {results.map(({ airport: a, distanceKm, bearingDeg }) => (
        <li key={a.icao} className="flex min-h-[88px] items-center gap-4 rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand/7 font-mono text-sm leading-5 font-extrabold text-brand">{a.icao}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-5 font-bold text-ink">{a.name}</p>
            <p className="pt-0.5 text-xs leading-4 text-[#64748b]">
              {a.city}, {a.country}
              {a.iata && <> · IATA: {a.iata}</>} · {formatNumber(Math.round(distanceKm))} km / {formatNumber(Math.round(distanceKm * KM_TO_NM))} NM · {Math.round(bearingDeg)}°
            </p>
          </div>
          <Link
            href={`/airports/${a.icao.toLowerCase()}`}
            aria-label={`View ${a.name}`}
            className="flex h-9 shrink-0 items-center rounded-xl bg-[linear-gradient(152.79deg,#2f80ed_0%,#00c2ff_100%)] px-3.5 text-xs leading-4 font-semibold text-white transition hover:brightness-110"
          >
            View →
          </Link>
        </li>
      ))}
    </ul>
  );
}
