import { ChevronDown } from "lucide-react";
import type { Runway } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const FT_TO_M = 0.3048;

function dims(r: Runway) {
  return `${formatNumber(Math.round(r.lengthFt * FT_TO_M))} x ${Math.round(r.widthFt * FT_TO_M)} m`;
}

/** Schematic plan of the runways, drawn to scale from length and true heading. */
function RunwayDiagram({ runways }: { runways: Runway[] }) {
  const size = 420;
  const c = size / 2;
  const maxLen = Math.max(...runways.map((r) => r.lengthFt));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Runway layout diagram" className="mx-auto h-auto w-full max-w-[420px]">
      <circle cx={c} cy={c} r={c - 8} className="fill-surface stroke-line" strokeWidth={1} />
      <text x={c} y={24} textAnchor="middle" className="fill-muted text-[12px] font-bold">
        N
      </text>
      {runways.map((r, i) => {
        const len = (r.lengthFt / maxLen) * (size - 110);
        const offset = (i - (runways.length - 1) / 2) * 44;
        const [startEnd, endEnd] = r.designator.split("/");
        return (
          <g key={r.designator} transform={`rotate(${r.headingDeg} ${c} ${c}) translate(${offset} 0)`}>
            <rect x={c - 8} y={c - len / 2} width={16} height={len} rx={2} className="fill-navy-900" />
            <line x1={c} y1={c - len / 2 + 10} x2={c} y2={c + len / 2 - 10} className="stroke-white" strokeWidth={1.5} strokeDasharray="8 8" />
            <text x={c} y={c + len / 2 + 16} textAnchor="middle" className="fill-ink font-mono text-[11px] font-bold">
              {startEnd}
            </text>
            <text x={c} y={c - len / 2 - 7} textAnchor="middle" className="fill-ink font-mono text-[11px] font-bold">
              {endEnd}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RunwaysPanel({ runways }: { runways: Runway[] }) {
  if (runways.length === 0) {
    return <p className="rounded-[20px] bg-white p-6 text-sm text-muted shadow-card">No runway data is published for this airport.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto] items-center rounded-[20px] bg-[#eef6ff] px-5 py-5 text-sm font-semibold text-ink md:px-10">
        <span>Runway Number</span>
        <span>Dimensions</span>
        <span className="w-[92px]" aria-hidden />
      </div>
      {runways.map((r) => (
        <details key={r.designator} className="group rounded-[20px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
          <summary className="grid min-h-[70px] cursor-pointer list-none grid-cols-[1fr_1fr_auto] items-center gap-2 px-5 text-sm font-semibold text-ink md:px-10 [&::-webkit-details-marker]:hidden">
            <span>
              {r.designator} ({Math.round(r.headingDeg)}°)
            </span>
            <span>{dims(r)}</span>
            <span className="flex w-[92px] items-center justify-center gap-1 rounded-md border border-line py-1 text-[11px] font-medium text-muted shadow-soft">
              <span className="group-open:hidden">show more</span>
              <span className="hidden group-open:inline">show less</span>
              <ChevronDown className="size-3 transition group-open:rotate-180" aria-hidden />
            </span>
          </summary>
          <dl className="space-y-4 px-5 pb-6 text-sm md:px-10">
            {[
              ["Runway Number", r.designator],
              ["Dimensions", `${dims(r)} (${formatNumber(r.lengthFt)} x ${r.widthFt} ft)`],
              ["Surface", r.surface],
              ["Runway Heading", `${Math.round(r.headingDeg)}° true`],
              ["Lighting", r.lighting ? "Edge & centreline lighting available" : "Unlit"],
              ["Instrument Landing System", r.ils ?? "No ILS"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-2">
                <dt className="font-semibold text-ink">{label}</dt>
                <dd className="text-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}

      <section aria-labelledby="runway-diagram" className="pt-3">
        <h3 id="runway-diagram" className="text-base font-bold text-ink">
          Runway Diagram
        </h3>
        <div className="mt-3 rounded-[20px] border border-line bg-white p-4">
          <RunwayDiagram runways={runways} />
        </div>
      </section>
    </div>
  );
}
