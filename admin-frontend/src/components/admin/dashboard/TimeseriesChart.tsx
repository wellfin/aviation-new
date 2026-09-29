"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPeriod, type Interval } from "./range";

export interface SeriesPoint {
  period: string;
  value: number;
}

const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 44, left: 56 };

/** Rounds `max` up to a "nice" axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(max: number): number {
  if (max <= 0) return 4;
  const exp = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= max) return m * exp;
  return 10 * exp;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Accessible single-series chart drawn as inline SVG: bars (counts) or a line (amounts).
 * Hover titles give exact values; a visually hidden table exposes the data to screen readers.
 */
export function TimeseriesChart({
  title,
  data,
  interval,
  kind,
  yLabel,
  minAxisMax = 4,
  format = (v) => v.toLocaleString("en-GB"),
}: {
  title: string;
  data: SeriesPoint[];
  interval: Interval;
  kind: "bar" | "line";
  yLabel: string;
  /** Smallest y-axis maximum (keeps an all-zero series readable, e.g. ₹100 for money). */
  minAxisMax?: number;
  format?: (value: number) => string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const total = data.reduce((a, p) => a + p.value, 0);
  // Multiple of 4 so the four grid steps land on whole numbers.
  const max = Math.ceil(Math.max(minAxisMax, niceMax(Math.max(0, ...data.map((p) => p.value)))) / 4) * 4;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = Math.max(1, data.length);
  const step = plotW / n;
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 72))));
  const barW = Math.max(2, Math.min(28, step - 2));

  const linePath = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <figure className="m-0">
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-labelledby={`${titleId} ${descId}`} className="block overflow-visible">
            <title id={titleId}>{title}</title>
            <desc id={descId}>
              {`${data.length} ${interval}s, total ${format(total)}. Hover a ${kind === "bar" ? "bar" : "point"} for its value; the full data is in the table below.`}
            </desc>

            {/* Grid + y axis */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                  {format(t)}
                </text>
              </g>
            ))}
            <text transform={`translate(12 ${PAD.top + plotH / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted text-[11px] font-semibold">
              {yLabel}
            </text>

            {/* X axis labels */}
            {data.map((p, i) =>
              i % labelEvery === 0 ? (
                <text key={p.period} x={x(i)} y={PAD.top + plotH + 16} textAnchor="middle" className="fill-muted text-[11px]">
                  {formatPeriod(p.period, interval)}
                </text>
              ) : null,
            )}
            <text x={PAD.left + plotW / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-muted text-[11px] font-semibold">
              {interval === "day" ? "Day" : interval === "week" ? "Week starting (Mon, UTC)" : "Month"}
            </text>

            {kind === "line" && data.length > 0 && <path d={linePath} fill="none" className="stroke-brand" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

            {data.map((p, i) => {
              const tip = `${formatPeriod(p.period, interval, "long")}: ${format(p.value)}`;
              const h = PAD.top + plotH - y(p.value);
              return (
                <g key={p.period} className="group">
                  <title>{tip}</title>
                  {/* Hit target: the whole column, bigger than the mark. */}
                  <rect x={PAD.left + step * i} y={PAD.top} width={step} height={plotH} fill="transparent" className="group-hover:fill-brand/5" />
                  {kind === "bar" && p.value > 0 && (
                    <path
                      d={roundedTopBar(x(i) - barW / 2, y(p.value), barW, h, Math.min(4, barW / 2, h))}
                      className="fill-brand transition-opacity group-hover:opacity-80"
                    />
                  )}
                  {kind === "line" && (n <= 12 || p.value > 0) && (
                    <circle cx={x(i)} cy={y(p.value)} r={4} className="fill-brand stroke-white group-hover:[r:6px]" strokeWidth={2} />
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {width === 0 && <div style={{ height: HEIGHT }} />}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{interval === "day" ? "Day" : interval === "week" ? "Week starting" : "Month"}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.period}>
              <th scope="row">{formatPeriod(p.period, interval, "long")}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}
