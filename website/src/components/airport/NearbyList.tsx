import type { NearbyAirport } from "@/lib/types";
import { KM_TO_NM, formatNumber } from "@/lib/utils";
import { InfoCard, InfoGrid } from "./InfoGrid";

/** Nearby Airport tab, in the Airport Information layout: one row card per airport, plain text. */
export function NearbyList({ results, radiusKm }: { results: NearbyAirport[]; radiusKm: number }) {
  if (results.length === 0) {
    return (
      <InfoCard>
        <p className="px-5 text-[15px] font-medium text-[#757575] md:text-base">No other listed airports within {formatNumber(radiusKm)} km.</p>
      </InfoCard>
    );
  }
  // Each airport fills one row card: name over its city, then its codes over the distance.
  const fields = results.flatMap(({ airport: a, distanceKm }) => [
    { label: a.name, value: `${a.city}, ${a.country}` },
    {
      label: `${a.icao}${a.iata ? ` / ${a.iata}` : ""}`,
      value: `${formatNumber(Math.round(distanceKm))} km (${formatNumber(Math.round(distanceKm * KM_TO_NM))} NM) away`,
    },
  ]);
  return (
    <InfoCard>
      <InfoGrid fields={fields} />
    </InfoCard>
  );
}
