import { Clock, Compass, Milestone, Plane, Route, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cardClass, IcaoTile } from "@/components/tools-pages/AirportCards";
import { DistanceForm } from "@/components/tools-pages/DistanceForm";
import { bearingLabel, compassPoint } from "@/components/tools-pages/format";
import { type AirportLookup, attempt, lookupAirport, readCode } from "@/components/tools-pages/lookup";
import { ToolLayout } from "@/components/tools-pages/ToolLayout";
import { ServiceErrorPanel, ToolMessage } from "@/components/tools-pages/ToolStates";
import { getDistance } from "@/lib/data/airports";
import type { Airport } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

/** Typical cruise speeds offered for the flight-time estimate (?speed=). */
const CRUISE_OPTIONS = [
  { kts: 280, label: "Turboprop" },
  { kts: 420, label: "Light jet" },
  { kts: 450, label: "Midsize jet" },
  { kts: 490, label: "Long-range jet" },
] as const;
const DEFAULT_CRUISE_KT = 450;

function parseSpeed(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return CRUISE_OPTIONS.some((o) => o.kts === n) ? n : DEFAULT_CRUISE_KT;
}

const ROUTES: Array<[string, string]> = [
  ["EGLL", "KJFK"],
  ["OMDB", "WSSS"],
  ["EDDF", "OMDB"],
  ["KJFK", "EDDF"],
  ["WSSS", "EGLL"],
];

export async function generateMetadata({ searchParams }: PageProps<"/tools/distance">): Promise<Metadata> {
  const sp = await searchParams;
  const from = readCode(sp.from);
  const to = readCode(sp.to);
  const route = from && to ? `${from} to ${to}` : undefined;
  return {
    title: route ? `${route} Distance & Flight Time` : "Airport Distance Calculator",
    description: route
      ? `Great-circle distance from ${from} to ${to} in km, nautical miles and miles, with initial bearing and estimated business-jet flight time.`
      : "Calculate the great-circle distance between two airports in km, NM and miles, with initial bearing and estimated flight time.",
  };
}

function flightTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function Stat({ icon: Icon, label, value, detail, highlight }: { icon: LucideIcon; label: string; value: string; detail?: string; highlight?: boolean }) {
  return (
    <div className={cn(cardClass, "p-5", highlight && "bg-gradient-to-br from-navy-900 to-navy-800 text-white")}>
      <dt className={cn("flex items-center gap-2 text-xs font-semibold tracking-[0.6px] uppercase", highlight ? "text-brand-cyan" : "text-muted")}>
        <Icon className={cn("size-4", highlight ? "text-brand-cyan" : "text-brand")} aria-hidden />
        {label}
      </dt>
      <dd className="mt-2">
        <span className={cn("block text-2xl leading-8 font-extrabold", highlight ? "text-white" : "text-ink")}>{value}</span>
        {detail && <span className={cn("mt-0.5 block text-xs", highlight ? "text-white/60" : "text-subtle")}>{detail}</span>}
      </dd>
    </div>
  );
}

function problem(label: string, l: AirportLookup): string | null {
  if (l.status === "invalid") return `${label} “${l.code}” isn't a valid ICAO or IATA code.`;
  if (l.status === "not-found") return `We couldn't find a ${label.toLowerCase()} airport with the code “${l.code}”.`;
  return null;
}

export default async function DistancePage({ searchParams }: PageProps<"/tools/distance">) {
  const sp = await searchParams;
  const from = readCode(sp.from) ?? readCode(sp.icao);
  const to = readCode(sp.to);
  const [a, b] = await Promise.all([lookupAirport(from), lookupAirport(to)]);

  let body;
  if (a.status === "error" || b.status === "error") {
    body = <ServiceErrorPanel title="Airport data is temporarily unavailable" />;
  } else if (a.status === "found" && b.status === "found") {
    body = <DistanceResult from={a.airport} to={b.airport} speed={parseSpeed(sp.speed)} />;
  } else if (a.status === "empty" && b.status === "empty") {
    body = (
      <ToolMessage icon={Route} title="Pick two airports">
        <p>Enter a departure and destination ICAO code to calculate the great-circle distance and flight time.</p>
      </ToolMessage>
    );
  } else {
    const issues = [problem("Departure", a), problem("Destination", b)].filter(Boolean);
    body = issues.length ? (
      <ToolMessage icon={SearchX} title="Airport not found" tone="warning" role="status">
        {issues.map((i) => (
          <p key={i}>{i}</p>
        ))}
      </ToolMessage>
    ) : (
      <ToolMessage icon={Route} title={`Add ${a.status === "empty" ? "a departure" : "a destination"} airport`}>
        <p>Both airports are needed to calculate the route.</p>
      </ToolMessage>
    );
  }

  return (
    <ToolLayout
      title="Airport Distance Calculator"
      subtitle="Great-circle distance between any two airports in kilometres, nautical miles and miles, with bearing and estimated flight time."
      crumb="Distance Calculator"
      form={<DistanceForm from={from} to={to} />}
      quickPicks={ROUTES.map(([f, t]) => ({ label: `${f} → ${t}`, href: `/tools/distance?from=${f}&to=${t}`, active: f === from && t === to }))}
    >
      {body}
    </ToolLayout>
  );
}

async function DistanceResult({ from: fromAirport, to: toAirport, speed }: { from: Airport; to: Airport; speed: number }) {
  const res = await attempt(`getDistance(${fromAirport.icao},${toAirport.icao})`, () => getDistance(fromAirport.icao, toAirport.icao, speed));
  if (!res.ok || !res.data) return <ServiceErrorPanel title="Distance calculation is temporarily unavailable" />;
  const { from, to, distanceKm: km, distanceNm: nm, distanceMi: mi, bearingDeg: bearing, speedKts, flightTimeMinutes } = res.data;

  return (
    <div className="space-y-6">
      <div className={cn(cardClass, "grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto_1fr]")}>
        {[from, to].map((ap, i) => (
          <div key={ap.icao} className={cn("flex items-center gap-4", i === 1 && "sm:order-3 sm:flex-row-reverse sm:text-right")}>
            <IcaoTile code={ap.icao} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.6px] text-subtle uppercase">{i === 0 ? "Departure" : "Destination"}</p>
              <Link href={`/airports/${ap.icao}`} className="block truncate text-base font-bold text-ink hover:text-brand">
                {ap.shortName}
              </Link>
              <p className="text-xs text-muted">
                {ap.city}, {ap.country}
              </p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 text-brand sm:order-2 sm:flex-col" aria-hidden>
          <span className="h-px flex-1 bg-line sm:h-auto sm:w-24 sm:flex-none sm:border-t sm:border-dashed sm:border-brand/40" />
          <Plane className="size-5 shrink-0" />
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Route} label="Distance" value={`${formatNumber(Math.round(nm))} NM`} detail="Nautical miles, great circle" highlight />
        <Stat icon={Route} label="Kilometres" value={`${formatNumber(Math.round(km))} km`} detail="Kilometres, great circle" />
        <Stat icon={Milestone} label="Miles" value={`${formatNumber(Math.round(mi))} mi`} detail="Statute miles, great circle" />
        <Stat icon={Compass} label="Initial bearing" value={bearingLabel(bearing)} detail={`${compassPoint(bearing)} · true`} />
        <Stat icon={Clock} label="Est. flight time" value={flightTime(flightTimeMinutes)} detail={`At ${speedKts} kt TAS`} />
      </dl>

      <nav aria-label="Cruise speed for the flight-time estimate" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">Aircraft:</span>
        {CRUISE_OPTIONS.map((o) => (
          <Link
            key={o.kts}
            href={`/tools/distance?from=${from.icao}&to=${to.icao}&speed=${o.kts}`}
            aria-current={o.kts === speedKts ? "true" : undefined}
            scroll={false}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              o.kts === speedKts ? "bg-brand-gradient border-transparent text-white" : "border-brand/20 bg-white text-brand hover:bg-brand/5",
            )}
          >
            {o.label} · {o.kts} kt
          </Link>
        ))}
      </nav>

      <p className="text-xs leading-5 text-subtle">
        Distances are great-circle (shortest path over the earth&apos;s surface). Flight time assumes a constant {speedKts} kt cruise with no wind,
        routing, taxi, climb or descent allowances — for planning estimates only.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link href={`/tools/weather?icao=${to.icao}`} className="rounded-lg bg-brand/8 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/15">
          {to.icao} weather
        </Link>
        <Link href={`/tools/notams?icao=${to.icao}`} className="rounded-lg bg-brand/8 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/15">
          {to.icao} NOTAMs
        </Link>
      </div>
    </div>
  );
}
