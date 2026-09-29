import { Globe } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AirportInfoCard, cardClass } from "@/components/tools-pages/AirportCards";
import { IcaoSearchForm } from "@/components/tools-pages/IcaoSearchForm";
import { attempt, lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { SatelliteViewer } from "@/components/tools-pages/SatelliteViewer";
import { icaoQuickPicks, ToolLayout } from "@/components/tools-pages/ToolLayout";
import { LookupFallback, ToolMessage } from "@/components/tools-pages/ToolStates";
import { getNearbyAirports } from "@/lib/data/airports";
import type { Airport } from "@/lib/types";
import { cn, KM_TO_NM } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/tools/satellite-map">): Promise<Metadata> {
  const code = readCode((await searchParams).icao);
  return {
    title: code ? `${code} Satellite Map — Airport Aerial View` : "Airport Satellite Map",
    description: code
      ? `Interactive satellite and map view of ${code} with airport reference data and nearby airports.`
      : "Interactive satellite and map view for any airport worldwide with airport information and nearby airports.",
  };
}

export default async function SatelliteMapPage({ searchParams }: PageProps<"/tools/satellite-map">) {
  const code = readCode((await searchParams).icao);
  const lookup = await lookupAirport(code);

  return (
    <ToolLayout
      title="Satellite Map"
      subtitle="Interactive satellite and map view for any airport worldwide with runway overlay and nearby aviation highlights."
      crumb="Satellite Map"
      form={<IcaoSearchForm action="/tools/satellite-map" buttonLabel="Open Map" defaultValue={code} />}
      quickPicks={icaoQuickPicks("/tools/satellite-map", code)}
    >
      {lookup.status === "found" ? (
        <SatelliteResults airport={lookup.airport} />
      ) : (
        <LookupFallback
          lookup={lookup}
          empty={
            <ToolMessage icon={Globe} title="Search for an Airport">
              <p>Enter an ICAO or IATA code to open the satellite map view</p>
            </ToolMessage>
          }
        />
      )}
    </ToolLayout>
  );
}

async function SatelliteResults({ airport }: { airport: Airport }) {
  const nearby = await attempt(`getNearbyAirports(${airport.icao})`, () => getNearbyAirports(airport.icao, 250, 3));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SatelliteViewer lat={airport.lat} lon={airport.lon} icao={airport.icao} name={airport.shortName} />
      <aside className="space-y-4">
        <AirportInfoCard airport={airport} />
        <section className={cn(cardClass, "p-5")} aria-labelledby="sat-nearby">
          <h3 id="sat-nearby" className="text-sm font-bold text-ink">
            Nearby Airports
          </h3>
          {!nearby.ok ? (
            <p className="mt-3 text-xs text-muted">Nearby airports are temporarily unavailable.</p>
          ) : nearby.data.results.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No airports within 250 km.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line/70">
              {nearby.data.results.map((r) => (
                <li key={r.airport.icao}>
                  <Link href={`/tools/satellite-map?icao=${r.airport.icao}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                    <span className="min-w-0 truncate text-sm text-ink">
                      <span className="mr-2 font-mono text-xs font-bold text-brand">{r.airport.icao}</span>
                      {r.airport.shortName}
                    </span>
                    <span className="shrink-0 text-xs text-subtle">{Math.round(r.distanceKm * KM_TO_NM)}NM</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/tools/nearby-airports?icao=${airport.icao}`}
            className="mt-3 flex h-10 items-center rounded-xl bg-brand-gradient px-7 text-sm font-semibold text-white transition hover:brightness-110"
          >
            All Nearby →
          </Link>
        </section>
      </aside>
    </div>
  );
}
