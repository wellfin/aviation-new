/** Date-range presets for the reports dashboard (all dates are UTC calendar days, `YYYY-MM-DD`). */

export const RANGE_PRESETS = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"] | "custom";
export type Interval = "day" | "week" | "month";

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isValidDay(v: string): boolean {
  return DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export interface ResolvedRange {
  preset: RangePreset;
  /** Inclusive first day. */
  from: string;
  /** Inclusive last day (the API treats a date-only `to` as the whole day). */
  to: string;
  days: number;
  error?: string;
}

/** Reads `range`, `from`, `to` URL values into a concrete, validated range. */
export function resolveRange(range: string, fromParam: string, toParam: string, now = new Date()): ResolvedRange {
  const today = isoDay(now);
  if (range === "custom") {
    const from = isValidDay(fromParam) ? fromParam : isoDay(new Date(now.getTime() - 29 * DAY_MS));
    const to = isValidDay(toParam) ? toParam : today;
    const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
    if (days < 1) return { preset: "custom", from, to, days: 1, error: "The start date must be on or before the end date." };
    if (days > 5 * 366) return { preset: "custom", from, to, days, error: "The range can be at most 5 years." };
    return { preset: "custom", from, to, days };
  }
  const preset = RANGE_PRESETS.find((p) => p.value === range) ?? RANGE_PRESETS[1];
  return { preset: preset.value, from: isoDay(new Date(now.getTime() - (preset.days - 1) * DAY_MS)), to: today, days: preset.days };
}

/** Picks a readable bucket size for the range (and stays within the API's bucket limits). */
export function defaultInterval(days: number): Interval {
  if (days <= 62) return "day";
  if (days <= 366) return "week";
  return "month";
}

/** Intervals the API accepts for this range (day ≤ 366 buckets, week ≤ 260). */
export function allowedIntervals(days: number): Interval[] {
  const out: Interval[] = [];
  if (days <= 366) out.push("day");
  if (days <= 7 * 259) out.push("week");
  out.push("month");
  return out;
}

export function formatPeriod(iso: string, interval: Interval, style: "short" | "long" = "short"): string {
  const d = new Date(iso);
  if (interval === "month") return d.toLocaleDateString("en-GB", { month: "short", year: style === "long" ? "numeric" : "2-digit", timeZone: "UTC" });
  const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(style === "long" ? { year: "numeric" } : {}), timeZone: "UTC" });
  return interval === "week" && style === "long" ? `Week of ${label}` : label;
}
