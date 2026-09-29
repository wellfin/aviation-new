import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { zuluTime } from "@/components/tools-pages/format";
import { IcaoSearchForm } from "@/components/tools-pages/IcaoSearchForm";
import { attempt, lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { NotamList, type NotamStatus, type NotamView } from "@/components/tools-pages/NotamList";
import { icaoQuickPicks, ToolLayout } from "@/components/tools-pages/ToolLayout";
import { LookupFallback, ServiceErrorPanel, ToolMessage } from "@/components/tools-pages/ToolStates";
import { getNotams } from "@/lib/integrations/notams";
import type { Airport, Notam } from "@/lib/types";

export async function generateMetadata({ searchParams }: PageProps<"/tools/notams">): Promise<Metadata> {
  const code = readCode((await searchParams).icao);
  return {
    title: code ? `${code} NOTAMs — Active Notices to Airmen` : "NOTAM Alerts — Search NOTAMs by ICAO",
    description: code
      ? `Current and scheduled NOTAMs for ${code}: runway closures, navaid outages, obstacles and more, with severity highlighting.`
      : "Search NOTAMs by airport ICAO code. Runway closures, navaid outages and airspace restrictions with severity highlighting.",
  };
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

function toView(n: Notam, now: number): NotamView {
  const from = new Date(n.effectiveFrom).getTime();
  const to = n.effectiveTo ? new Date(n.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
  const status: NotamStatus = from > now ? "Scheduled" : to < now ? "Expired" : "Active";
  return { ...n, status, fromLabel: zuluTime(n.effectiveFrom), toLabel: n.effectiveTo ? zuluTime(n.effectiveTo) : "PERM" };
}

export default async function NotamsPage({ searchParams }: PageProps<"/tools/notams">) {
  const code = readCode((await searchParams).icao);
  const lookup = await lookupAirport(code);

  return (
    <ToolLayout
      title="NOTAM Alerts"
      subtitle="Search NOTAMs by airport ICAO code. Data sourced hourly from ICAO NOF feeds across all contracting states."
      crumb="NOTAM Alerts"
      form={<IcaoSearchForm action="/tools/notams" buttonLabel="Search NOTAMs" defaultValue={code} />}
      quickPicks={icaoQuickPicks("/tools/notams", code)}
    >
      {lookup.status === "found" ? (
        <NotamResults airport={lookup.airport} />
      ) : (
        <LookupFallback
          lookup={lookup}
          empty={
            <ToolMessage icon={TriangleAlert} title="Search for NOTAMs" tone="warning">
              <p>Enter an airport ICAO code to retrieve current NOTAMs</p>
            </ToolMessage>
          }
        />
      )}
    </ToolLayout>
  );
}

async function NotamResults({ airport }: { airport: Airport }) {
  const res = await attempt(`getNotams(${airport.icao})`, () => getNotams(airport.icao));
  if (!res.ok) {
    return <ServiceErrorPanel title="NOTAM service is temporarily unavailable">We couldn&apos;t load NOTAMs for {airport.icao} just now. Please try again in a few minutes.</ServiceErrorPanel>;
  }
  if (res.data.length === 0) {
    return (
      <ToolMessage icon={ShieldCheck} title={`No NOTAMs for ${airport.icao}`} role="status">
        <p>There are no current or scheduled NOTAMs published for {airport.shortName}.</p>
      </ToolMessage>
    );
  }
  // eslint-disable-next-line react-hooks/purity -- request-time snapshot for Active/Scheduled status
  const now = Date.now();
  const notams = res.data
    .map((n) => toView(n, now))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.effectiveFrom.localeCompare(b.effectiveFrom));
  return <NotamList notams={notams} airportName={airport.shortName} />;
}
