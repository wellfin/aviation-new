import { z } from "zod";
import { validationError } from "../../lib/errors.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** ISO date (`2026-09-01`) or date-time (`2026-09-01T10:00:00Z`). */
const dateParam = z
  .string()
  .trim()
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/, "Use an ISO date, e.g. 2026-09-01")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const dateRangeShape = { from: dateParam.optional(), to: dateParam.optional() };

/** Half-open interval [from, to). */
export interface DateRange {
  from: Date;
  to: Date;
}

function parseBound(value: string, isEnd: boolean): Date {
  // Date-only values are UTC days; an end date includes that whole day.
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value);
  return isEnd && DATE_ONLY.test(value) ? new Date(date.getTime() + DAY_MS) : date;
}

/**
 * Resolves optional `from`/`to` query values into a bounded range.
 * Defaults to the last `defaultDays` days; rejects inverted or oversized ranges.
 */
export function resolveRange(q: { from?: string | undefined; to?: string | undefined }, opts: { defaultDays?: number; maxDays?: number } = {}): DateRange {
  const { defaultDays = 30, maxDays = 5 * 366 } = opts;
  const to = q.to ? parseBound(q.to, true) : new Date();
  const from = q.from ? parseBound(q.from, false) : new Date(to.getTime() - defaultDays * DAY_MS);
  if (from >= to) throw validationError({ from: "Must be before 'to'" });
  if (to.getTime() - from.getTime() > maxDays * DAY_MS) throw validationError({ from: `The range can be at most ${maxDays} days` });
  return { from, to };
}

/** Like `resolveRange` but only applies the bounds that were given (no defaults). */
export function optionalRange(q: { from?: string | undefined; to?: string | undefined }): { $gte?: Date; $lt?: Date } | undefined {
  if (!q.from && !q.to) return undefined;
  const cond: { $gte?: Date; $lt?: Date } = {};
  if (q.from) cond.$gte = parseBound(q.from, false);
  if (q.to) cond.$lt = parseBound(q.to, true);
  if (cond.$gte && cond.$lt && cond.$gte >= cond.$lt) throw validationError({ from: "Must be before 'to'" });
  return cond;
}
