"use client";

import { useUrlParams } from "@/lib/hooks/useUrlParams";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads a `YYYY-MM-DD` URL param, ignoring anything malformed. */
export function dateParam(value: string): string {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : "";
}

/** True when both bounds are set and `from` is after `to`. */
export function isInvertedRange(from: string, to: string): boolean {
  return Boolean(from && to && from > to);
}

/** Start / end of a UTC day as ISO timestamps, for APIs that compare against exact instants. */
export const dayStart = (d: string) => (d ? `${d}T00:00:00.000Z` : undefined);
export const dayEnd = (d: string) => (d ? `${d}T23:59:59.999Z` : undefined);

/** "From" / "To" date inputs synced to the `from` / `to` URL params. */
export function DateRangeFilter({ label = "Received" }: { label?: string }) {
  const { get, set } = useUrlParams();
  const from = dateParam(get("from"));
  const to = dateParam(get("to"));
  const inverted = isInvertedRange(from, to);
  const input = "h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand aria-invalid:border-danger";

  return (
    <fieldset className="flex flex-wrap items-center gap-2 text-sm">
      <legend className="sr-only">{label} date range</legend>
      <label className="flex items-center gap-2">
        <span className="text-muted">{label} from</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value })} className={input} aria-invalid={inverted || undefined} />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted">to</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value })} className={input} aria-invalid={inverted || undefined} />
      </label>
      {(from || to) && (
        <button type="button" onClick={() => set({ from: "", to: "" })} className="text-sm font-semibold text-brand hover:underline">
          Clear dates
        </button>
      )}
      {inverted && (
        <p role="alert" className="w-full text-xs font-medium text-danger">
          The start date must be on or before the end date.
        </p>
      )}
    </fieldset>
  );
}
