import "server-only";
import { config } from "@/lib/config";

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** URL slugs the API accepts (anything else can only be a 404). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/*
 * Query params come straight from the URL. The API rejects out-of-range values
 * with 400, so they are normalised here and a hand-edited URL degrades to a
 * sensible listing instead of an error page.
 */
export const clampQuery = (q: string | undefined): string => (q ?? "").trim().slice(0, 100);
export const clampPage = (page: number | undefined): number => (page && Number.isFinite(page) ? Math.min(Math.max(Math.trunc(page), 1), 10_000) : 1);
export const clampPageSize = (size: number | undefined, fallback: number, max = 100): number =>
  size && Number.isFinite(size) ? Math.min(Math.max(Math.trunc(size), 1), max) : fallback;
/** 2-letter country code or undefined. */
export const countryParam = (v: string | undefined): string | undefined => (v && /^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : undefined);
/** 3/4-character IATA/ICAO code or undefined. */
export const airportParam = (v: string | undefined): string | undefined => (v && /^[A-Za-z0-9]{3,4}$/.test(v.trim()) ? v.trim().toUpperCase() : undefined);

type QueryValue = string | number | boolean | undefined | null;

export function buildQuery(params: Record<string, QueryValue>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * GET a JSON resource from the platform backend (/api/v1/...). Returns null on 404.
 * `noStore` skips Next's data cache — for per-request results such as ad rotation.
 */
export async function apiGet<T>(path: string, init?: { revalidate?: number; noStore?: boolean }): Promise<T | null> {
  const res = await fetch(`${config.API_BASE_URL}/api/v1${path}`, {
    headers: { Accept: "application/json", ...(config.INTERNAL_API_KEY ? { "x-internal-api-key": config.INTERNAL_API_KEY } : {}) },
    ...(init?.noStore ? { cache: "no-store" as const } : { next: { revalidate: init?.revalidate ?? 60 } }),
    signal: AbortSignal.timeout(config.INTEGRATION_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError(`API ${path} failed`, res.status);
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** Fetch JSON from a third-party integration with a timeout. */
export async function fetchJson<T>(url: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const { revalidate, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { Accept: "application/json", ...(rest.headers ?? {}) },
    next: { revalidate: revalidate ?? 300 },
    signal: AbortSignal.timeout(config.INTEGRATION_TIMEOUT_MS),
  });
  if (!res.ok) throw new UpstreamError(`Upstream request failed (${res.status})`, res.status);
  return (await res.json()) as T;
}
