import { ChevronDown } from "lucide-react";
import { bearingLabel, metres } from "@/components/tools-pages/format";
import type { Airport, Runway } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function reciprocal(deg: number): number {
  return (deg + 180) % 360;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-3 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className="text-sm text-muted">{value}</dd>
    </div>
  );
}

function RunwayRow({ runway, airport, open }: { runway: Runway; airport: Airport; open: boolean }) {
  const [a, b] = runway.designator.split("/");
  return (
    <details open={open} className="group rounded-[20px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[200px_1fr_auto] sm:px-8 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-sm font-bold text-ink">
          {runway.designator} <span className="font-sans font-normal text-muted">({bearingLabel(runway.headingDeg)})</span>
        </span>
        <span className="text-sm font-semibold text-ink">
          {formatNumber(metres(runway.lengthFt))} × {metres(runway.widthFt)} m
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-muted">
          <span className="group-open:hidden">Show more</span>
          <span className="hidden group-open:inline">Show less</span>
          <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <dl className="divide-y divide-line/70 border-t border-line/70 px-5 pb-3 sm:px-8">
        <Detail label="Runway Number" value={b ? `${a} / ${b}` : runway.designator} />
        <Detail label="Dimensions" value={`${formatNumber(metres(runway.lengthFt))} × ${metres(runway.widthFt)} m (${formatNumber(runway.lengthFt)} × ${runway.widthFt} ft)`} />
        <Detail label="Surface" value={runway.surface} />
        <Detail label="Runway Heading" value={`${bearingLabel(runway.headingDeg)} / ${bearingLabel(reciprocal(runway.headingDeg))} true`} />
        <Detail label="Lighting" value={runway.lighting ? "Lighted" : "Unlighted"} />
        <Detail label="Instrument Approach" value={runway.ils ?? "No precision approach listed"} />
        <Detail label="Aerodrome Elevation" value={`${formatNumber(airport.elevationFt)} ft AMSL`} />
        <Detail label="Aerodrome Reference Point" value={`${airport.lat.toFixed(4)}, ${airport.lon.toFixed(4)}`} />
      </dl>
    </details>
  );
}

/** Expandable runway list: one summary row per runway, first one open. */
export function RunwayTable({ airport }: { airport: Airport }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 rounded-[20px] bg-brand/6 px-5 py-4 text-xs font-semibold text-ink sm:grid-cols-[200px_1fr_auto] sm:px-8 sm:text-sm">
        <span>Runway Number</span>
        <span>Dimensions</span>
        <span className="w-[92px]" aria-hidden />
      </div>
      <div className="mt-2 space-y-2">
        {airport.runways.map((r, i) => (
          <RunwayRow key={r.designator} runway={r} airport={airport} open={i === 0} />
        ))}
      </div>
    </div>
  );
}
