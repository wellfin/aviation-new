import Link from "next/link";
import type { ReactNode } from "react";
import type { Airport } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export const cardClass = "rounded-[20px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]";

/** Dark ICAO tile ("EGLL") used to identify the airport a result belongs to. */
export function IcaoTile({ code, variant = "dark", className }: { code: string; variant?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-xl font-mono font-bold",
        variant === "dark" ? "bg-gradient-to-br from-navy-900 to-navy-800 text-lg text-brand-cyan" : "bg-brand/8 text-sm text-brand",
        className,
      )}
    >
      {code}
    </span>
  );
}

/** Wide card naming the searched airport, with an optional right-hand slot (count, badge…). */
export function AirportHeaderCard({ airport, aside }: { airport: Airport; aside?: ReactNode }) {
  return (
    <div className={cn(cardClass, "flex flex-wrap items-center gap-4 p-5")}>
      <IcaoTile code={airport.icao} />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg leading-7 font-bold text-ink sm:text-xl">
          <Link href={`/airports/${airport.icao}`} className="hover:text-brand">
            {airport.shortName}
          </Link>
        </h2>
        <p className="text-sm text-muted">
          {airport.city}, {airport.country}
          {airport.iata && <span className="text-subtle"> · IATA {airport.iata}</span>}
        </p>
      </div>
      {aside}
    </div>
  );
}

/** "Airport Info" key/value card from the satellite map design. */
export function AirportInfoCard({ airport, className }: { airport: Airport; className?: string }) {
  const rows: Array<[string, string]> = [
    ["ICAO", airport.icao],
    ["IATA", airport.iata || "—"],
    ["City", airport.city],
    ["Country", airport.country],
    ["Elevation", `${formatNumber(airport.elevationFt)} ft`],
    ["Latitude", airport.lat.toFixed(4)],
    ["Longitude", airport.lon.toFixed(4)],
  ];
  return (
    <section className={cn(cardClass, "p-5", className)} aria-labelledby={`info-${airport.icao}`}>
      <h3 id={`info-${airport.icao}`} className="text-sm font-bold text-ink">
        Airport Info
      </h3>
      <dl className="mt-2 divide-y divide-line/70">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-subtle">{k}</dt>
            <dd className="text-right font-mono text-xs font-bold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
