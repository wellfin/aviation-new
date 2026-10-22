import Image from "next/image";
import { isRemoteImage } from "@/components/ads/ad-link";
import type { Runway } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { InfoCard } from "./InfoGrid";

const FT_TO_M = 0.3048;

const metres = (r: Runway) => `${formatNumber(Math.round(r.lengthFt * FT_TO_M))} x ${Math.round(r.widthFt * FT_TO_M)} m`;

function dims(r: Runway) {
  return `${formatNumber(Math.round(r.lengthFt * FT_TO_M))} x ${Math.round(r.widthFt * FT_TO_M)} m (${formatNumber(r.lengthFt)} x ${r.widthFt} ft)`;
}

/** Schematic plan of the runways, drawn to scale from length and true heading. */
function RunwayDiagram({ runways }: { runways: Runway[] }) {
  const size = 420;
  const c = size / 2;
  const maxLen = Math.max(...runways.map((r) => r.lengthFt));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Runway layout diagram" className="mx-auto h-full w-auto max-w-full">
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

/**
 * Runways tab, in the Airport Information layout: one white card with each runway as label/value
 * row cards (remaining details under "More … (Click to expand)"), then the runway diagram.
 * `diagram` is the admin-uploaded chart; without one a schematic is drawn.
 */
export function RunwaysPanel({ runways, diagram, airportName }: { runways: Runway[]; diagram?: string; airportName: string }) {
  if (runways.length === 0 && !diagram) {
    return (
      <InfoCard>
        <p className="px-5 text-[15px] font-medium text-[#757575] md:text-base">No runway data is published for this airport.</p>
      </InfoCard>
    );
  }
  return (
    <div>
      {/* Figma: a light-blue "Runway Number | Dimensions" header, then one white row card per runway with a show more toggle. */}
      <div className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] min-h-[58px] rounded-[16px] bg-[#eaf3ff] px-5 text-sm font-semibold text-ink sm:px-[58px]" aria-hidden>
        <span>Runway Number</span>
        <span>Dimensions</span>
        <span className="w-[78px]" />
      </div>
      <ul className="mt-1.5 space-y-1.5" aria-label="Runways">
        {runways.map((r) => (
          <li key={r.designator}>
            <details className="group rounded-[16px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
              <summary className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] min-h-[60px] cursor-pointer list-none px-5 text-[15px] font-medium text-ink sm:px-[58px] [&::-webkit-details-marker]:hidden">
                <span>
                  {r.designator} ({Math.round(r.headingDeg)}°)
                </span>
                <span>{metres(r)}</span>
                <span className="flex w-[78px] items-center justify-center gap-1 rounded-md border border-line py-1.5 text-[10px] font-medium whitespace-nowrap text-ink transition group-hover:border-brand">
                  <span className="group-open:hidden">show more</span>
                  <span className="hidden group-open:inline">Show Less</span>
                  <ChevronDown className="size-3 transition group-open:rotate-180" aria-hidden />
                </span>
              </summary>
              <dl className="pb-4">
                {[
                  { label: "Runway Number", value: r.designator },
                  { label: "Dimensions", value: dims(r) },
                  { label: "PCN", value: r.pcn },
                  { label: "Surface", value: r.surface },
                  { label: "Coordinates", value: r.coordinates },
                  { label: "Elevation", value: r.elevation },
                  { label: "Runway Heading", value: `${Math.round(r.headingDeg)}° true` },
                  { label: "Displaced Threshold", value: r.displacedThreshold },
                ].map((f) => (
                  <div key={f.label} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] min-h-12 px-5 text-[15px] text-ink sm:px-[58px]">
                    <dt className="font-medium">{f.label}</dt>
                    <dd className="text-ink/90">{f.value || "—"}</dd>
                    <span className="w-[78px]" aria-hidden />
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>

      <section aria-labelledby="runway-diagram" className="mt-6 rounded-[16px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:p-6">
        {/* Figma: a bold title over the chart in a thin grey frame. */}
        <h3 id="runway-diagram" className="pb-3 text-base leading-6 font-bold text-ink">
          Runway Diagram
        </h3>
        <div className="relative aspect-[1108/662] overflow-hidden rounded-[12px] border border-[#cfd4dc] bg-white">
          {diagram ? (
            <Image src={diagram} alt={`${airportName} runway diagram`} fill sizes="(min-width: 1280px) 808px, 100vw" unoptimized={isRemoteImage(diagram)} className="object-contain" />
          ) : (
            <div className="absolute inset-0 p-3">
              <RunwayDiagram runways={runways} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
