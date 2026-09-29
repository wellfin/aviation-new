import { CloudSun } from "lucide-react";
import type { Metadata } from "next";
import { ToolTiles } from "@/components/tools/ToolTiles";
import { AirportHeaderCard, AirportInfoCard } from "@/components/tools-pages/AirportCards";
import { IcaoSearchForm } from "@/components/tools-pages/IcaoSearchForm";
import { attempt, lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { icaoQuickPicks, ToolLayout } from "@/components/tools-pages/ToolLayout";
import { LookupFallback, ServiceErrorPanel, ToolMessage } from "@/components/tools-pages/ToolStates";
import { FlightCategoryBadge, FlightCategoryLegend, MetarCard, TafCard } from "@/components/tools-pages/WeatherReport";
import { getNotams } from "@/lib/integrations/notams";
import { getMetar, getTaf } from "@/lib/integrations/weather";
import type { Airport } from "@/lib/types";

export async function generateMetadata({ searchParams }: PageProps<"/tools/weather">): Promise<Metadata> {
  const code = readCode((await searchParams).icao);
  return {
    title: code ? `${code} METAR & TAF — Aviation Weather` : "Aviation Weather — METAR & TAF",
    description: code
      ? `Live METAR observation and TAF forecast for ${code}, decoded with wind, visibility, temperature, QNH, clouds and flight category.`
      : "Look up live METAR and TAF aviation weather for any airport by ICAO code, decoded with flight category.",
  };
}

export default async function WeatherPage({ searchParams }: PageProps<"/tools/weather">) {
  const code = readCode((await searchParams).icao);
  const lookup = await lookupAirport(code);

  return (
    <ToolLayout
      title="Aviation Weather"
      subtitle="Live METAR observations and TAF forecasts for any airport, decoded into plain language with flight category."
      crumb="Weather"
      form={<IcaoSearchForm action="/tools/weather" buttonLabel="Get Weather" defaultValue={code} />}
      quickPicks={icaoQuickPicks("/tools/weather", code)}
    >
      {lookup.status === "found" ? (
        <WeatherResults icao={lookup.airport.icao} airport={lookup.airport} />
      ) : (
        <LookupFallback
          lookup={lookup}
          empty={
            <ToolMessage icon={CloudSun} title="Select an Airport">
              <p>Enter an ICAO code above to load the latest METAR and TAF.</p>
            </ToolMessage>
          }
        />
      )}
    </ToolLayout>
  );
}

async function WeatherResults({ icao, airport }: { icao: string; airport: Airport }) {
  const [metar, taf, notams] = await Promise.all([
    attempt(`getMetar(${icao})`, () => getMetar(icao)),
    attempt(`getTaf(${icao})`, () => getTaf(icao)),
    attempt(`getNotams(${icao})`, () => getNotams(icao)),
  ]);

  const category = metar.ok && metar.data ? metar.data.flightCategory : undefined;

  return (
    <div className="space-y-6">
      <AirportHeaderCard airport={airport} aside={category && <FlightCategoryBadge category={category} />} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {!metar.ok || !taf.ok ? (
            <ServiceErrorPanel title="Weather service is temporarily unavailable">
              We couldn&apos;t load {!metar.ok && !taf.ok ? "METAR or TAF" : !metar.ok ? "the METAR" : "the TAF"} for {icao} just now. Please try
              again in a few minutes.
            </ServiceErrorPanel>
          ) : null}
          {metar.ok &&
            (metar.data ? (
              <MetarCard metar={metar.data} />
            ) : (
              <ServiceErrorPanel title="No METAR available">{icao} has no current METAR observation. The station may not report weather.</ServiceErrorPanel>
            ))}
          {taf.ok &&
            (taf.data ? (
              <TafCard taf={taf.data} />
            ) : (
              <ServiceErrorPanel title="No TAF available">{icao} does not currently publish a terminal aerodrome forecast.</ServiceErrorPanel>
            ))}
        </div>
        <aside className="space-y-6">
          <FlightCategoryLegend />
          <AirportInfoCard airport={airport} />
        </aside>
      </div>

      <section aria-labelledby="more-tools">
        <h2 id="more-tools" className="mb-3 text-base font-bold text-ink">
          More tools for {icao}
        </h2>
        <ToolTiles icao={icao} flightCategory={category ?? "—"} notamCount={notams.ok ? notams.data.length : 0} />
      </section>
    </div>
  );
}
