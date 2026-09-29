import { LifeBuoy, MapPinOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AirportHeaderCard, cardClass, IcaoTile } from "@/components/tools-pages/AirportCards";
import { bearingLabel, compassPoint } from "@/components/tools-pages/format";
import { IcaoSearchForm } from "@/components/tools-pages/IcaoSearchForm";
import { attempt, lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { icaoQuickPicks, ToolLayout } from "@/components/tools-pages/ToolLayout";
import { LookupFallback, ServiceErrorPanel, ToolMessage } from "@/components/tools-pages/ToolStates";
import { getNearbyAirports } from "@/lib/data/airports";
import type { Airport } from "@/lib/types";
import { cn, firstParam, formatNumber, KM_TO_NM } from "@/lib/utils";

const RADII = [50, 100, 150, 250, 500, 1000] as const;
const DEFAULT_RADIUS = 250;

function readRadius(v: string | string[] | undefined): number {
  const n = Number.parseInt(firstParam(v) ?? "", 10);
  return (RADII as readonly number[]).includes(n) ? n : DEFAULT_RADIUS;
}

export async function generateMetadata({ searchParams }: PageProps<"/tools/nearby-airports">): Promise<Metadata> {
  const code = readCode((await searchParams).icao);
  return {
    title: code ? `Airports near ${code} — Nearby Airports Finder` : "Nearby Airports Finder",
    description: code
      ? `Airports within range of ${code}, sorted by great-circle distance with bearing in km and nautical miles.`
      : "Find airports within a specified radius of any airport worldwide, sorted by distance with bearing.",
  };
}

export default async function NearbyAirportsPage({ searchParams }: PageProps<"/tools/nearby-airports">) {
  const sp = await searchParams;
  const code = readCode(sp.icao);
  const radius = readRadius(sp.radius);
  const lookup = await lookupAirport(code);

  return (
    <ToolLayout
      title="Nearby Airports"
      subtitle="Find airports within a specified radius of any airport worldwide, sorted by proximity with distance and bearing."
      crumb="Nearby Airports"
      form={
        <IcaoSearchForm action="/tools/nearby-airports" buttonLabel="Find Nearby" defaultValue={code}>
          <label className="relative shrink-0">
            <span className="sr-only">Search radius</span>
            <select
              name="radius"
              defaultValue={String(radius)}
              className="h-[52px] w-full appearance-none rounded-xl border border-white/20 bg-white/10 bg-[url('/images/shared/chevron-down.svg')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9 pl-4 text-sm text-white outline-none focus:border-brand-cyan sm:w-[120px] [&>option]:text-ink"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </label>
        </IcaoSearchForm>
      }
      quickPicks={icaoQuickPicks("/tools/nearby-airports", code, { radius: String(radius) })}
    >
      {lookup.status === "found" ? (
        <NearbyResults airport={lookup.airport} radius={radius} />
      ) : (
        <LookupFallback
          lookup={lookup}
          empty={
            <ToolMessage icon={LifeBuoy} title="Enter an Airport Code">
              <p>Search from any origin airport to find all nearby airports within your chosen radius</p>
            </ToolMessage>
          }
        />
      )}
    </ToolLayout>
  );
}

async function NearbyResults({ airport, radius }: { airport: Airport; radius: number }) {
  const res = await attempt(`getNearbyAirports(${airport.icao})`, () => getNearbyAirports(airport.icao, radius, 25));
  if (!res.ok) return <ServiceErrorPanel title="Nearby airport search is temporarily unavailable" />;
  const results = res.data.results;

  return (
    <div className="space-y-6">
      <AirportHeaderCard
        airport={airport}
        aside={
          <div className="text-right">
            <p className="text-xs font-semibold text-subtle uppercase">Found</p>
            <p className="text-xl leading-7 font-extrabold text-brand">{results.length}</p>
            <p className="text-xs text-subtle">within {radius} km</p>
          </div>
        }
      />

      {results.length === 0 ? (
        <ToolMessage icon={MapPinOff} title="No airports in range" role="status">
          <p>
            No airports in our directory are within {radius} km of {airport.icao}.{" "}
            {radius < 1000 && (
              <Link href={`/tools/nearby-airports?icao=${airport.icao}&radius=${RADII.find((r) => r > radius)}`} className="font-semibold text-brand hover:underline">
                Widen the search
              </Link>
            )}
          </p>
        </ToolMessage>
      ) : (
        <ol className="space-y-2">
          {results.map(({ airport: a, distanceKm, bearingDeg }) => (
            <li key={a.icao} className={cn(cardClass, "flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap")}>
              <IcaoTile code={a.icao} variant="light" />
              <div className="min-w-0 flex-1 max-sm:w-[calc(100%-72px)] max-sm:flex-none">
                <h3 className="text-sm font-bold text-ink sm:truncate">{a.name}</h3>
                <p className="text-xs text-muted">
                  {a.city}, {a.country}
                  {a.iata && ` · IATA: ${a.iata}`}
                </p>
              </div>
              <dl className="flex gap-6 sm:gap-8 sm:text-right">
                <div className="sm:w-[150px]">
                  <dt className="text-[10px] font-semibold tracking-[0.6px] text-subtle uppercase">Distance</dt>
                  <dd className="text-sm font-bold text-ink">
                    {formatNumber(Math.round(distanceKm))} km <span className="font-normal text-muted">· {formatNumber(Math.round(distanceKm * KM_TO_NM))} NM</span>
                  </dd>
                </div>
                <div className="sm:w-[90px]">
                  <dt className="text-[10px] font-semibold tracking-[0.6px] text-subtle uppercase">Bearing</dt>
                  <dd className="font-mono text-sm font-bold text-ink">
                    {bearingLabel(bearingDeg)} <span className="font-sans font-normal text-muted">{compassPoint(bearingDeg)}</span>
                  </dd>
                </div>
              </dl>
              <Link
                href={`/airports/${a.icao}`}
                className="ml-auto rounded-lg bg-brand-gradient px-3.5 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                aria-label={`View ${a.name}`}
              >
                View →
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
