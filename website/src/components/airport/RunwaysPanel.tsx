import Image from "next/image";
import { isRemoteImage } from "@/components/ads/ad-link";
import type { Runway } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const FT_TO_M = 0.3048;

/** Poppins SemiBold, as drawn for this tab (Figma 960:966). */
const TEXT = "font-poppins font-semibold tracking-[-0.4492px] text-[#343a40]";
const CELL = "min-w-0 flex-1 xl:w-[254px] xl:flex-none";
/** Invisible 56px lead-in the design keeps before the first column. */
const LEAD = "hidden size-14 shrink-0 xl:block";
const BUTTON = "flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[rgba(11,31,58,0.2)] px-3.5";

function dims(r: Runway) {
  return `${formatNumber(Math.round(r.lengthFt * FT_TO_M))} x ${Math.round(r.widthFt * FT_TO_M)} m`;
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
 * Runways tab (Figma 960:469): a header row, one expandable card per runway (Figma 959:310)
 * and the runway diagram. `diagram` is the admin-uploaded chart; without one a schematic is drawn.
 */
export function RunwaysPanel({ runways, diagram, airportName }: { runways: Runway[]; diagram?: string; airportName: string }) {
  if (runways.length === 0 && !diagram) {
    return <p className="rounded-[20px] bg-white p-6 text-sm text-muted shadow-card">No runway data is published for this airport.</p>;
  }
  return (
    <div>
      <div className="space-y-2">
        <div className={cn("flex min-h-[88px] items-center gap-4 rounded-[20px] bg-[#eef7ff] p-4 text-[15px] leading-[25px] sm:text-base", TEXT)}>
          <span className={LEAD} aria-hidden />
          <span className={CELL}>Runway Number</span>
          <span className={CELL}>Dimensions</span>
          {/* Keeps the columns aligned with the rows' "show more" button. */}
          <span className="w-[116px] shrink-0" aria-hidden />
        </div>
        {runways.map((r) => (
          <details key={r.designator} className="group rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
            <summary className={cn("flex min-h-14 cursor-pointer list-none items-center gap-4 text-[15px] leading-[25px] sm:text-lg [&::-webkit-details-marker]:hidden", TEXT)}>
              <span className={LEAD} aria-hidden />
              <span className={CELL}>
                {r.designator} ({Math.round(r.headingDeg)}°)
              </span>
              <span className={CELL}>{dims(r)}</span>
              {/* 116px slot so the columns do not shift when the label changes. */}
              <span className="flex w-[116px] shrink-0">
                <span className={cn(BUTTON, "font-poppins text-xs leading-[15px] font-semibold tracking-normal text-[#495057] transition group-hover:border-brand")}>
                  <span className="group-open:hidden">show more</span>
                  <span className="hidden group-open:inline">Show Less</span>
                  <Image src="/images/airport/show-more-chevron.svg" alt="" width={10} height={6} className="h-1.5 w-2.5 group-open:rotate-180" />
                </span>
              </span>
            </summary>
            <dl className={cn("mt-4 space-y-4 text-[15px] leading-[25px] sm:text-lg", TEXT)}>
              {[
                ["Runway Number", r.designator],
                ["Dimensions", `${dims(r)} (${formatNumber(r.lengthFt)} x ${r.widthFt} ft)`],
                ["PCN", r.pcn || "—"],
                ["Surface", r.surface],
                ["Coordinates", r.coordinates || "—"],
                ["Elevation", r.elevation || "—"],
                ["Runway Heading", `${Math.round(r.headingDeg)}° true`],
                ["Displaced Threshold", r.displacedThreshold || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex min-h-14 items-center gap-4">
                  <span className={LEAD} aria-hidden />
                  <dt className={CELL}>{label}</dt>
                  <dd className="min-w-0 flex-1 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>

      <section aria-labelledby="runway-diagram" className="pt-[22px]">
        <h3 id="runway-diagram" className={cn("text-xl leading-[25px]", TEXT)}>
          Runway Diagram
        </h3>
        {/* 807×489 frame as drawn (Figma 960:778). */}
        <div className="relative mt-[15px] aspect-[807/489] overflow-hidden rounded-xl border border-black/28 bg-white">
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
