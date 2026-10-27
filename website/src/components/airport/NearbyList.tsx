import Link from "next/link";
import { cardClass, IcaoTile } from "@/components/tools-pages/AirportCards";
import type { NearbyAirport } from "@/lib/types";
import { KM_TO_NM, cn, formatNumber } from "@/lib/utils";
import { InfoCard } from "./InfoGrid";

/** At most this many airports, closest first (Figma). */
const MAX_NEARBY = 4;

/** Nearby Airport tab (Figma): one row card per airport — ICAO tile, name, city · IATA and a View button. */
export function NearbyList({ results, radiusKm }: { results: NearbyAirport[]; radiusKm: number }) {
  if (results.length === 0) {
    return (
      <InfoCard>
        <p className="px-5 text-[15px] font-medium text-[#757575] md:text-base">No other listed airports within {formatNumber(radiusKm)} km.</p>
      </InfoCard>
    );
  }
  return (
    <ol className="space-y-3" aria-label="Nearby airports">
      {results.slice(0, MAX_NEARBY).map(({ airport: a, distanceKm }) => (
        <li key={a.icao} className={cn(cardClass, "flex items-center gap-4 p-4 sm:px-5")}>
          <IcaoTile code={a.icao} variant="light" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-ink">{a.name}</h3>
            <p className="text-sm text-muted">
              {a.city}, {a.country}
              {a.iata && ` · IATA: ${a.iata}`}
              <span className="sr-only">
                {" "}
                · {formatNumber(Math.round(distanceKm))} km ({formatNumber(Math.round(distanceKm * KM_TO_NM))} NM) away
              </span>
            </p>
          </div>
          <Link
            href={`/airports/${a.icao.toLowerCase()}`}
            // Opens the airport in a new browser tab, keeping this page open.
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            aria-label={`View ${a.name} (opens in a new tab)`}
          >
            View →
          </Link>
        </li>
      ))}
    </ol>
  );
}
