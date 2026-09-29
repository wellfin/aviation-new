import "server-only";
import { config } from "@/lib/config";
import { fetchJson } from "@/lib/data/http";
import type { Notam, NotamSeverity } from "@/lib/types";

/**
 * NOTAMs.
 *  - NOTAM_PROVIDER=mock        → demo NOTAMs (default)
 *  - NOTAM_PROVIDER=faa-search  → FAA NOTAM Search (https://notams.aim.faa.gov/notamSearch), public, no key.
 *                                 Worldwide ICAO locations.
 *  - NOTAM_PROVIDER=faa         → FAA NOTAM API (FAA_NOTAM_CLIENT_ID / FAA_NOTAM_CLIENT_SECRET), https://api.faa.gov
 */
export async function getNotams(icao: string): Promise<Notam[]> {
  const code = icao.toUpperCase();
  if (config.NOTAM_PROVIDER === "faa-search") {
    try {
      return await notamsFromFaaSearch(code);
    } catch (err) {
      // The public search site blocks some regions/hosts; fall back to the official API when keys exist.
      if (config.FAA_NOTAM_CLIENT_ID && config.FAA_NOTAM_CLIENT_SECRET) return notamsFromFaa(code);
      throw err;
    }
  }
  if (config.NOTAM_PROVIDER === "faa") return notamsFromFaa(code);
  return mockNotams(code);
}

export function classifySeverity(text: string): NotamSeverity {
  const t = text.toUpperCase();
  // Critical only when a runway or the aerodrome itself is closed (not e.g. taxiway lights near a runway).
  if (/\bRWY\s+[\dLRC/]+\s+(CLSD|CLOSED)\b/.test(t) || /\b(AD|AERODROME)\s+(CLSD|CLOSED)\b/.test(t)) return "critical";
  if (/\b(CLSD|U\/S|OBST|CRANE|WIP|LGT)\b/.test(t)) return "warning";
  return "info";
}

interface FaaNotamResponse {
  items: Array<{
    properties: {
      coreNOTAMData: {
        notam: {
          id: string;
          number: string;
          type: string;
          icaoLocation: string;
          effectiveStart: string;
          effectiveEnd: string;
          text: string;
          classification?: string;
          selectionCode?: string;
        };
      };
    };
  }>;
}

async function notamsFromFaa(icao: string): Promise<Notam[]> {
  if (!config.FAA_NOTAM_CLIENT_ID || !config.FAA_NOTAM_CLIENT_SECRET) {
    throw new Error("FAA_NOTAM_CLIENT_ID / FAA_NOTAM_CLIENT_SECRET are not configured");
  }
  const body = await fetchJson<FaaNotamResponse>(
    `https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=${icao}&pageSize=50&sortBy=effectiveStartDate&sortOrder=Desc`,
    {
      headers: { client_id: config.FAA_NOTAM_CLIENT_ID, client_secret: config.FAA_NOTAM_CLIENT_SECRET },
      revalidate: 600,
    },
  );
  return body.items.map(({ properties }) => {
    const n = properties.coreNOTAMData.notam;
    return {
      id: n.id,
      icao: n.icaoLocation,
      number: n.number,
      type: n.classification ?? n.type,
      severity: classifySeverity(n.text),
      subject: n.selectionCode ?? n.text.split(/[.\n]/)[0].slice(0, 80),
      text: n.text,
      effectiveFrom: n.effectiveStart,
      effectiveTo: n.effectiveEnd === "PERM" ? null : n.effectiveEnd,
    };
  });
}

/* ---------------- FAA NOTAM Search (notams.aim.faa.gov) ---------------- */

const FAA_SEARCH_URL = "https://notams.aim.faa.gov/notamSearch/search";
const SEARCH_PAGE_SIZE = 30;
const SEARCH_MAX_PAGES = 3;
const SEARCH_TTL_MS = 10 * 60_000;

interface FaaSearchNotam {
  notamNumber: string;
  facilityDesignator?: string;
  icaoId?: string;
  featureName?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  icaoMessage?: string;
  traditionalMessage?: string;
  traditionalMessageFrom4thWord?: string;
  cancelledOrExpired?: boolean;
  status?: string;
}

interface FaaSearchResponse {
  notamList?: FaaSearchNotam[];
  totalNotamCount?: number;
  error?: string;
}

// Form POSTs aren't cached by Next's fetch cache, so keep a short in-memory cache per airport.
const searchCache = new Map<string, { at: number; value: Notam[] }>();

/** Parses FAA search dates ("09/27/2026 1230", optionally suffixed "EST") as UTC; "PERM"/blank → null. */
export function parseFaaSearchDate(value: string | undefined): string | null {
  const m = value?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})(\d{2})/);
  if (!m) return null;
  const [, mm, dd, yyyy, hh, mi] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi))).toISOString();
}

async function searchPage(icao: string, offset: number): Promise<FaaSearchResponse> {
  const body = new URLSearchParams({
    searchType: "0",
    designatorsForLocation: icao,
    notamsOnly: "false",
    offset: String(offset),
    sortColumns: "5 false",
    sortDirection: "true",
  });
  const res = await fetch(FAA_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "GlobalAviationDirectory/1.0" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(config.INTEGRATION_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`FAA NOTAM search failed (${res.status})`);
  return (await res.json()) as FaaSearchResponse;
}

async function notamsFromFaaSearch(icao: string): Promise<Notam[]> {
  const cached = searchCache.get(icao);
  if (cached && Date.now() - cached.at < SEARCH_TTL_MS) return cached.value;

  const items: FaaSearchNotam[] = [];
  for (let page = 0; page < SEARCH_MAX_PAGES; page++) {
    const res = await searchPage(icao, page * SEARCH_PAGE_SIZE);
    if (res.error) throw new Error(`FAA NOTAM search error: ${res.error}`);
    const list = res.notamList ?? [];
    items.push(...list);
    if (list.length < SEARCH_PAGE_SIZE || items.length >= (res.totalNotamCount ?? 0)) break;
  }

  const notams = items
    .filter((n) => !n.cancelledOrExpired)
    .map((n, i): Notam => {
      const text = (n.icaoMessage || n.traditionalMessage || "").trim();
      // Drop the trailing validity window ("2605200830-2612312300EST") — dates are shown separately.
      const summary = (n.traditionalMessageFrom4thWord || text).replace(/\s*\d{10}(EST)?-(\d{10}(EST)?|PERM)\s*$/, "").trim();
      return {
        id: `${icao}-${n.notamNumber}-${i}`,
        icao: n.icaoId || icao,
        number: n.notamNumber,
        type: n.featureName || n.keyword || "NOTAM",
        severity: classifySeverity(text),
        subject: summary.split(/[.\n]/)[0]?.slice(0, 80) || n.keyword || "NOTAM",
        text,
        effectiveFrom: parseFaaSearchDate(n.startDate) ?? new Date().toISOString(),
        effectiveTo: parseFaaSearchDate(n.endDate),
      };
    });

  searchCache.set(icao, { at: Date.now(), value: notams });
  return notams;
}

export function mockNotams(icao: string, now: Date = new Date()): Notam[] {
  const day = 86_400_000;
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();
  const entries: Array<Omit<Notam, "id" | "icao" | "severity">> = [
    { number: "A1842/26", type: "Runway", subject: "RWY closure", text: `${icao} RWY 09L/27R CLSD DUE TO MAINT. DAILY 2300-0500.`, effectiveFrom: iso(-1), effectiveTo: iso(6) },
    { number: "A1836/26", type: "Obstacle", subject: "Crane erected", text: "OBST CRANE ERECTED 1.2NM E OF ARP. HGT 312FT AMSL. LGTD.", effectiveFrom: iso(-3), effectiveTo: iso(20) },
    { number: "A1829/26", type: "Navaid", subject: "ILS U/S", text: "ILS RWY 27L GP U/S.", effectiveFrom: iso(-2), effectiveTo: iso(2) },
    { number: "A1811/26", type: "Taxiway", subject: "TWY works", text: "TWY B BTN B4 AND B6 WIP. MARKED AND LGTD.", effectiveFrom: iso(-6), effectiveTo: iso(14) },
    { number: "A1798/26", type: "Aerodrome", subject: "Bird activity", text: "INCREASED BIRD ACTIVITY IN VICINITY OF AD.", effectiveFrom: iso(-8), effectiveTo: null },
    { number: "A1790/26", type: "Services", subject: "Fuel availability", text: "JET A-1 FUEL AVBL WITH PRIOR NOTICE 2HR. AVGAS NOT AVBL.", effectiveFrom: iso(-10), effectiveTo: iso(30) },
  ];
  return entries.map((e, i) => ({ ...e, id: `${icao}-${i}`, icao, severity: classifySeverity(e.text) }));
}
