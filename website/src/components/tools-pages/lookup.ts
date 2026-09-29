import "server-only";
import { getAirport } from "@/lib/data/airports";
import type { Airport } from "@/lib/types";
import { firstParam } from "@/lib/utils";

export const ICAO_PATTERN = /^[A-Z0-9]{3,4}$/;

/** Normalise a `?icao=` search param: trimmed, upper-cased, or undefined when empty. */
export function readCode(value: string | string[] | undefined): string | undefined {
  const v = firstParam(value)?.trim().toUpperCase();
  return v ? v : undefined;
}

export type Attempt<T> = { ok: true; data: T } | { ok: false };

/** Run an integration call and turn any thrown error into a soft failure the page can render. */
export async function attempt<T>(label: string, fn: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    console.error(`[tools] ${label} failed:`, err);
    return { ok: false };
  }
}

export type AirportLookup =
  | { status: "empty" }
  | { status: "invalid"; code: string }
  | { status: "not-found"; code: string }
  | { status: "error"; code: string }
  | { status: "found"; code: string; airport: Airport };

/** Resolve the airport a tool page was asked about, covering every non-happy path. */
export async function lookupAirport(code: string | undefined): Promise<AirportLookup> {
  if (!code) return { status: "empty" };
  if (!ICAO_PATTERN.test(code)) return { status: "invalid", code };
  const res = await attempt(`getAirport(${code})`, () => getAirport(code));
  if (!res.ok) return { status: "error", code };
  if (!res.data) return { status: "not-found", code };
  return { status: "found", code, airport: res.data };
}
