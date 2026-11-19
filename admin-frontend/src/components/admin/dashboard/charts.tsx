"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatPeriod, type Interval } from "./range";
import type { SeriesPoint } from "./TimeseriesChart";

/**
 * Categorical slots in fixed order (validated light-mode palette: CVD-safe for the first three).
 * Text never uses these colours; they mark identity next to text.
 */
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;

export interface Series {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Rounds up to a "nice" axis maximum that splits into 4 steps. */
function niceMax(max: number, floor: number): number {
  const m = Math.max(max, floor);
  const exp = 10 ** Math.floor(Math.log10(m));
  for (const k of [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10]) if (k * exp >= m) return k * exp;
  return 10 * exp;
}

const compact = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);

/**
 * Line chart for one or more series on ONE shared axis (same unit), with a hover crosshair and
 * a tooltip listing every series at that period. A single series gets a soft area fill.
 * A visually hidden table carries the full data.
 */
export function LineChart({
  title,
  series,
  interval,
  height = 260,
  format = (v) => v.toLocaleString("en-IN"),
  minMax = 4,
}: {
  title: string;
  series: Series[];
  interval: Interval;
  height?: number;
  format?: (v: number) => string;
  minMax?: number;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 14, right: 14, bottom: 28, left: 44 };
  const periods = series[0]?.points.map((p) => p.period) ?? [];
  const n = periods.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))), minMax);
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));
  const single = series.length === 1;

  const onMove = (clientX: number, rect: DOMRect) => {
    if (n === 0) return;
    const rel = clientX - rect.left - pad.left;
    const i = Math.round((rel / Math.max(1, plotW)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <figure className="m-0">
      <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}. Hover for values; the data is also in a table.`}
            className="block"
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={t === 0 ? undefined : "3 5"} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                  {compact(t)}
                </text>
              </g>
            ))}
            {periods.map((p, i) =>
              i % labelEvery === 0 ? (
                <text key={p} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {formatPeriod(p, interval)}
                </text>
              ) : null,
            )}
            {series.map((s) => {
              const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
              return (
                <g key={s.key}>
                  {single && n > 1 && <path d={`${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${uid}-${s.key})`} />}
                  <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                {series.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(s.points[hover]?.value ?? 0)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-xl border border-line bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur"
            style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
          >
            <p className="mb-1 font-semibold text-ink">{formatPeriod(periods[hover]!, interval, "long")}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
                <span className="font-semibold text-ink tabular-nums">{format(s.points[hover]?.value ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={p}>
              <th scope="row">{formatPeriod(p, interval, "long")}</th>
              {series.map((s) => (
                <td key={s.key}>{format(s.points[i]?.value ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Legend with each series' total (identity is never colour alone). */
export function Legend({ items }: { items: Array<{ label: string; color: string; value?: ReactNode }> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-3 rounded-full" style={{ background: i.color }} aria-hidden />
          {i.label}
          {i.value !== undefined && <span className="font-semibold text-ink tabular-nums">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Tiny trend line for a stat tile (decorative; the tile states the number). */
export function Sparkline({ points, color = SERIES_COLORS[0] }: { points: SeriesPoint[] | null | undefined; color?: string }) {
  const uid = useId().replace(/:/g, "");
  const w = 72;
  const h = 30;
  if (!points || points.length < 2) return <span className="block h-[30px] w-[72px]" aria-hidden />;
  const max = Math.max(1, ...points.map((p) => p.value));
  const xs = (i: number) => (i / (points.length - 1)) * w;
  const ys = (v: number) => h - 2 - (v / max) * (h - 4);
  const d = points.map((p, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.value).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${uid}-g)`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Ranked horizontal bars (one colour: magnitude). Each row shows its label and value as text;
 * hovering a row shows its share of the total.
 */
export function BarList({
  rows,
  color = SERIES_COLORS[0],
  empty = "No data in this range.",
  format = (v) => v.toLocaleString("en-IN"),
}: {
  rows: Array<{ label: ReactNode; value: number; key: string; sub?: ReactNode }>;
  color?: string;
  empty?: string;
  format?: (v: number) => string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || total === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="group" title={`${format(r.value)} · ${Math.round((r.value / total) * 100)}% of total`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">
              {r.label}
              {r.sub && <span className="ml-1.5 text-xs text-muted">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">
              {format(r.value)}
              <span className="ml-1.5 text-[11px] font-normal text-muted">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink/[0.06]">
            <div className={cn("h-2 rounded-full transition-[filter] group-hover:brightness-110")} style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One bar split into parts (parts of a whole), with a legend that names and counts each part. */
export function SegmentBar({ parts }: { parts: Array<{ label: string; value: number; color: string }> }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-ink/[0.06]" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <span key={p.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />)}
      </div>
      <div className="mt-3">
        <Legend items={parts.map((p) => ({ label: p.label, color: p.color, value: p.value.toLocaleString("en-IN") }))} />
      </div>
    </div>
  );
}
