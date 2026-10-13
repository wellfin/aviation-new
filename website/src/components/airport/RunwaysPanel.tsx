import Image from "next/image";
import { isRemoteImage } from "@/components/ads/ad-link";
import type { Runway } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { InfoCard, InfoGrid } from "./InfoGrid";

const FT_TO_M = 0.3048;

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
    <InfoCard>
      <div className="space-y-6">
        {runways.map((r) => (
          <InfoGrid
            key={r.designator}
            fields={[
              { label: "Runway Number", value: r.designator },
              { label: "Dimensions", value: dims(r) },
              { label: "Surface", value: r.surface || "—" },
              { label: "Runway Heading", value: `${Math.round(r.headingDeg)}° true` },
            ]}
            more={[
              { label: "PCN", value: r.pcn || "—" },
              { label: "Coordinates", value: r.coordinates || "—" },
              { label: "Elevation", value: r.elevation || "—" },
              { label: "Displaced Threshold", value: r.displacedThreshold || "—" },
              { label: "Lighting", value: r.lighting ? "Edge & centreline lighting" : "Unlit" },
              { label: "Instrument Landing System", value: r.ils || "No ILS" },
            ]}
            moreLabel={`More Runway ${r.designator} Information`}
          />
        ))}
      </div>

      <section aria-labelledby="runway-diagram" className="pt-6">
        <h3 id="runway-diagram" className="px-5 pb-3 text-sm leading-5 font-semibold text-ink uppercase lg:px-[45px]">
          Runway Diagram
        </h3>
        <div className="relative aspect-[807/489] overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
          {diagram ? (
            <Image src={diagram} alt={`${airportName} runway diagram`} fill sizes="(min-width: 1280px) 808px, 100vw" unoptimized={isRemoteImage(diagram)} className="object-contain" />
          ) : (
            <div className="absolute inset-0 p-3">
              <RunwayDiagram runways={runways} />
            </div>
          )}
        </div>
      </section>
    </InfoCard>
  );
}
