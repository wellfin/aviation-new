import { z } from "zod";
import { dateRangeShape } from "./date-range.js";

export const overviewQuery = z.object({ ...dateRangeShape });

export const TIMESERIES_METRICS = ["users", "enquiries", "revenue", "reviews"] as const;
export type TimeseriesMetric = (typeof TIMESERIES_METRICS)[number];

export const INTERVALS = ["day", "week", "month"] as const;
export type Interval = (typeof INTERVALS)[number];

export const timeseriesQuery = z.object({
  ...dateRangeShape,
  metric: z.enum(TIMESERIES_METRICS),
  interval: z.enum(INTERVALS).default("day"),
  /** Revenue is summed per currency (amounts in different currencies can't be added). */
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code")
    .transform((c) => c.toUpperCase())
    .default("INR"),
});
