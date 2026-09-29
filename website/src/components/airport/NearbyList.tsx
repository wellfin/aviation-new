import Link from "next/link";
import type { NearbyAirport } from "@/lib/types";
import { KM_TO_NM, formatNumber } from "@/lib/utils";

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
    <ul className="space-y-3">
      {results.map(({ airport: a, distanceKm, bearingDeg }) => (
        <li key={a.icao} className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3.5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand/6 font-mono text-[11px] font-extrabold text-brand">
            {a.icao}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{a.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {a.city}, {a.country}
              {a.iata && <> · IATA: {a.iata}</>} · {formatNumber(Math.round(distanceKm))} km / {formatNumber(Math.round(distanceKm * KM_TO_NM))} NM · {Math.round(bearingDeg)}°
            </p>
          </div>
          <Link
            href={`/airports/${a.icao.toLowerCase()}`}
            aria-label={`View ${a.name}`}
            className="bg-brand-gradient shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-110"
          >
            View →
          </Link>
        </li>
      ))}
    </ul>
  );
}
