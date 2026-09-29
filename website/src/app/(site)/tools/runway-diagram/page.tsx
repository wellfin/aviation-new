import { Info, SquarePlus } from "lucide-react";
import type { Metadata } from "next";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { AirportHeaderCard, cardClass } from "@/components/tools-pages/AirportCards";
import { IcaoSearchForm } from "@/components/tools-pages/IcaoSearchForm";
import { lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { RunwayDiagram } from "@/components/tools-pages/RunwayDiagram";
import { RunwayTable } from "@/components/tools-pages/RunwayTable";
import { icaoQuickPicks, ToolLayout } from "@/components/tools-pages/ToolLayout";
import { LookupFallback, ToolMessage } from "@/components/tools-pages/ToolStates";
import { getAdvertisement } from "@/lib/data/content";
import type { Airport } from "@/lib/types";
import { cn } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/tools/runway-diagram">): Promise<Metadata> {
  const code = readCode((await searchParams).icao);
  return {
    title: code ? `${code} Runway Diagram — Runways & Frequencies` : "Runway Diagrams — Dimensions, Surfaces & Frequencies",
    description: code
      ? `Runway diagram for ${code} with runway dimensions, surface, heading, lighting, instrument approaches and radio frequencies.`
      : "Technical runway diagrams with dimensions, surface data, heading and instrument approach information for airports worldwide.",
  };
}

export default async function RunwayDiagramPage({ searchParams }: PageProps<"/tools/runway-diagram">) {
  const code = readCode((await searchParams).icao);
  const lookup = await lookupAirport(code);

  return (
    <ToolLayout
      title="Runway Diagram"
      subtitle="Technical runway diagrams with dimensions, surface data, heading, and instrument approach information."
      crumb="Runway Diagram"
      form={<IcaoSearchForm action="/tools/runway-diagram" buttonLabel="Load Diagram" defaultValue={code} />}
      quickPicks={icaoQuickPicks("/tools/runway-diagram", code)}
    >
      {lookup.status === "found" ? (
        <RunwayResults airport={lookup.airport} />
      ) : (
        <LookupFallback
          lookup={lookup}
          empty={
            <ToolMessage icon={SquarePlus} title="Select an Airport">
              <p>Enter an ICAO code above to load runway diagrams and technical data</p>
            </ToolMessage>
          }
        />
      )}
    </ToolLayout>
  );
}

async function RunwayResults({ airport }: { airport: Airport }) {
  const ad = await getAdvertisement("sidebar");

  return (
    <div className="space-y-6">
      <AirportHeaderCard airport={airport} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {airport.runways.length === 0 ? (
            <ToolMessage icon={Info} title="No runway data" role="status">
              <p>We don&apos;t have runway information for {airport.icao} yet.</p>
            </ToolMessage>
          ) : (
            <>
              <RunwayTable airport={airport} />
              <section aria-labelledby="diagram-heading">
                <h2 id="diagram-heading" className="mb-3 text-base font-bold text-ink">
                  Runway Diagram
                </h2>
                <div className={cn(cardClass, "overflow-hidden p-3 sm:p-4")}>
                  <RunwayDiagram runways={airport.runways} icao={airport.icao} />
                </div>
                <p className="mt-3 flex gap-2 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-xs leading-5 text-[#92400e]">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  For planning purposes only — not for navigation. The schematic is drawn to scale from published runway lengths and headings;
                  relative runway positions are approximate. Always refer to the current AIP aerodrome chart.
                </p>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <section className={cn(cardClass, "p-5")} aria-labelledby="freq-heading">
            <h3 id="freq-heading" className="text-sm font-bold text-ink">
              Radio Frequencies
            </h3>
            {airport.frequencies.length ? (
              <ul className="mt-2 divide-y divide-line/70">
                {airport.frequencies.map((f) => (
                  <li key={`${f.type}-${f.mhz}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="mr-2 rounded bg-brand/8 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">{f.type}</span>
                      <span className="text-sm text-muted">{f.description}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold text-ink">{f.mhz}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No frequencies published.</p>
            )}
          </section>
          <SidebarAd ad={ad} className="min-h-[360px]" />
        </aside>
      </div>
    </div>
  );
}
