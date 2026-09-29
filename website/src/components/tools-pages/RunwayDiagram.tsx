import type { Runway } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { FT_TO_M } from "@/components/tools-pages/format";

interface Point {
  x: number;
  y: number;
}

interface Placed {
  runway: Runway;
  ends: [string, string];
  start: Point;
  end: Point;
  heading: number;
}

function endsOf(r: Runway): [string, string] {
  const [a, b] = r.designator.split("/");
  return [a?.trim() || r.designator, b?.trim() || ""];
}

function headingOf(r: Runway): number {
  if (Number.isFinite(r.headingDeg)) return r.headingDeg;
  const n = Number.parseInt(r.designator, 10);
  return Number.isFinite(n) ? n * 10 : 0;
}

const SIDE: Record<string, number> = { L: -1, C: 0, R: 1 };

/**
 * Lay runways out in a local frame measured in feet (x east, y south).
 * Parallel runways (same heading ±6°) are spaced laterally using their L/C/R suffixes;
 * runways with different headings cross at the aerodrome reference point.
 */
function layout(runways: Runway[]): Placed[] {
  const maxLen = Math.max(...runways.map((r) => r.lengthFt));
  const spacing = maxLen * 0.16;
  const groups: Runway[][] = [];
  for (const r of runways) {
    const h = headingOf(r) % 180;
    const g = groups.find((grp) => {
      const gh = headingOf(grp[0]) % 180;
      const diff = Math.abs(gh - h);
      return Math.min(diff, 180 - diff) <= 6;
    });
    if (g) g.push(r);
    else groups.push([r]);
  }

  return groups.flatMap((grp) => {
    const base = headingOf(grp[0]);
    return grp.map((r, i) => {
      const heading = headingOf(r);
      const ends = endsOf(r);
      // Lateral position relative to the group's first-end direction.
      const suffix = ends[0].slice(-1).toUpperCase();
      let side = suffix in SIDE ? SIDE[suffix] : i - (grp.length - 1) / 2;
      // A runway listed from its reciprocal end (e.g. 27L/09R vs 09L/27R) has L/R mirrored.
      const diff = Math.abs(((heading - base + 540) % 360) - 180);
      if (diff > 90) side = -side;
      const rad = (heading * Math.PI) / 180;
      const d = { x: Math.sin(rad), y: -Math.cos(rad) };
      const bRad = (base * Math.PI) / 180;
      const right = { x: Math.cos(bRad), y: Math.sin(bRad) };
      const offset = grp.length > 1 || suffix in SIDE ? side * spacing : 0;
      const c = { x: right.x * offset, y: right.y * offset };
      const half = r.lengthFt / 2;
      return {
        runway: r,
        ends,
        heading,
        start: { x: c.x - d.x * half, y: c.y - d.y * half },
        end: { x: c.x + d.x * half, y: c.y + d.y * half },
      };
    });
  });
}

function niceScale(spanFt: number): { m: number; ft: number } {
  const targetM = (spanFt * FT_TO_M) / 5;
  const steps = [100, 200, 250, 500, 1000, 2000, 2500, 5000];
  const m = steps.reduce((best, s) => (Math.abs(s - targetM) < Math.abs(best - targetM) ? s : best), steps[0]);
  return { m, ft: m / FT_TO_M };
}

/** To-scale schematic of an airport's runways, drawn from runway headings and lengths. */
export function RunwayDiagram({ runways, icao }: { runways: Runway[]; icao: string }) {
  const placed = layout(runways);
  const maxLen = Math.max(...runways.map((r) => r.lengthFt));
  const xs = placed.flatMap((p) => [p.start.x, p.end.x]);
  const ys = placed.flatMap((p) => [p.start.y, p.end.y]);
  const pad = maxLen * 0.14;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, w * 0.5);
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const top = Math.min(minY, cy - h / 2);
  const fs = maxLen * 0.024;
  const stroke = Math.max(maxLen * 0.016, fs * 0.7);
  const scale = niceScale(w);

  return (
    <svg
      viewBox={`${minX} ${top} ${w} ${h}`}
      className="mx-auto h-auto max-h-[620px] w-full"
      role="img"
      aria-labelledby={`rwy-${icao}-title rwy-${icao}-desc`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={`rwy-${icao}-title`}>{`${icao} runway diagram`}</title>
      <desc id={`rwy-${icao}-desc`}>
        {placed.map((p) => `Runway ${p.runway.designator}, ${formatNumber(p.runway.lengthFt)} by ${p.runway.widthFt} feet, heading ${Math.round(p.heading)} degrees true.`).join(" ")}
      </desc>
      <rect x={minX} y={top} width={w} height={h} fill="#f8fafc" />

      {placed.map((p, idx) => {
        const angle = p.heading - 90;
        const readable = angle > 90 || angle < -90 ? angle + 180 : angle;
        // Stagger dimension labels so crossing runways don't overlap at the intersection.
        const t = placed.length > 1 ? (idx % 2 === 0 ? 0.3 : 0.7) : 0.5;
        const mid = { x: p.start.x + (p.end.x - p.start.x) * t, y: p.start.y + (p.end.y - p.start.y) * t };
        const len = Math.hypot(p.end.x - p.start.x, p.end.y - p.start.y);
        const ux = (p.end.x - p.start.x) / len;
        const uy = (p.end.y - p.start.y) / len;
        const lab = fs * 1.4;
        return (
          <g key={p.runway.designator}>
            <line x1={p.start.x} y1={p.start.y} x2={p.end.x} y2={p.end.y} stroke="#0b1f3a" strokeWidth={stroke} />
            <line
              x1={p.start.x + ux * stroke}
              y1={p.start.y + uy * stroke}
              x2={p.end.x - ux * stroke}
              y2={p.end.y - uy * stroke}
              stroke="#ffffff"
              strokeWidth={stroke * 0.08}
              strokeDasharray={`${stroke * 0.8} ${stroke * 0.6}`}
            />
            <text
              x={mid.x}
              y={mid.y}
              transform={`rotate(${readable} ${mid.x} ${mid.y})`}
              dy={-stroke * 0.9}
              textAnchor="middle"
              fontSize={fs * 0.8}
              fontWeight={600}
              fill="#64748b"
            >
              {`${formatNumber(p.runway.lengthFt)} × ${p.runway.widthFt} ft`}
            </text>
            {[
              { label: p.ends[0], at: { x: p.start.x - ux * lab, y: p.start.y - uy * lab } },
              { label: p.ends[1], at: { x: p.end.x + ux * lab, y: p.end.y + uy * lab } },
            ]
              .filter((e) => e.label)
              .map((e) => (
                <g key={e.label}>
                  <circle cx={e.at.x} cy={e.at.y} r={fs * 1.05} fill="#2f80ed" />
                  <text x={e.at.x} y={e.at.y} dy={fs * 0.36} textAnchor="middle" fontSize={fs * 0.95} fontWeight={800} fill="#ffffff">
                    {e.label}
                  </text>
                </g>
              ))}
          </g>
        );
      })}

      {/* North arrow */}
      <g transform={`translate(${minX + w - fs * 2.2} ${top + fs * 2.6})`}>
        <path d={`M0 ${-fs * 1.6} L${fs * 0.7} ${fs * 0.6} L0 ${fs * 0.15} L${-fs * 0.7} ${fs * 0.6} Z`} fill="#0b1f3a" />
        <text y={-fs * 1.9} textAnchor="middle" fontSize={fs * 0.9} fontWeight={800} fill="#0b1f3a">
          N
        </text>
      </g>

      {/* Scale bar */}
      <g transform={`translate(${minX + fs * 1.2} ${top + h - fs * 1.4})`}>
        <rect width={scale.ft / 2} height={fs * 0.35} fill="#0b1f3a" />
        <rect x={scale.ft / 2} width={scale.ft / 2} height={fs * 0.35} fill="#ffffff" stroke="#0b1f3a" strokeWidth={fs * 0.06} />
        <text y={-fs * 0.4} fontSize={fs * 0.75} fill="#64748b">
          0
        </text>
        <text x={scale.ft} y={-fs * 0.4} textAnchor="end" fontSize={fs * 0.75} fill="#64748b">
          {`${formatNumber(scale.m)} m`}
        </text>
      </g>
    </svg>
  );
}

