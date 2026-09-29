import "server-only";
import { config } from "@/lib/config";
import { enrichAirport } from "@/lib/integrations/airportdb";
import { AIRPORTS } from "@/lib/mock/airports";
import type { Airport, NearbyAirport, Paginated } from "@/lib/types";
import { bearingDeg, haversineKm, KM_TO_MI, KM_TO_NM, paginate } from "@/lib/utils";
import { airportParam, apiGet, buildQuery, clampPage, clampPageSize, clampQuery, countryParam } from "./http";

const CONTINENTS = new Set(["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "Antarctica"]);

export interface AirportQuery {
  q?: string;
  continent?: string;
  country?: string;
  page?: number;
  pageSize?: number;
}

function matchesCode(a: Airport, code: string): boolean {
  const c = code.trim().toUpperCase();
  return a.icao === c || a.iata === c;
}

export async function listAirports(query: AirportQuery = {}): Promise<Paginated<Airport>> {
  const { q = "", continent, country, page = 1, pageSize = 12 } = query;
  if (config.DATA_SOURCE === "mock") {
    const needle = q.trim().toLowerCase();
    const list = AIRPORTS.filter(
      (a) =>
        (!needle || `${a.icao} ${a.iata} ${a.name} ${a.city} ${a.country}`.toLowerCase().includes(needle)) &&
        (!continent || a.continent === continent) &&
        (!country || a.countryCode === country.toUpperCase()),
    );
    return paginate(list, page, pageSize);
  }
  return (
    (await apiGet<Paginated<Airport>>(
      `/airports${buildQuery({
        q: clampQuery(q),
        continent: continent && CONTINENTS.has(continent) ? continent : undefined,
        country: countryParam(country),
        page: clampPage(page),
        pageSize: clampPageSize(pageSize, 12),
      })}`,
    )) ?? {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    }
  );
}

export async function getFeaturedAirports(): Promise<Airport[]> {
  if (config.DATA_SOURCE === "mock") return AIRPORTS.filter((a) => a.featured);
  return (await apiGet<Airport[]>("/airports/featured")) ?? [];
}

/** Resolve an airport by ICAO or IATA code, enriched with third-party reference data when configured. */
export async function getAirport(code: string): Promise<Airport | null> {
  const base =
    config.DATA_SOURCE === "mock"
      ? (AIRPORTS.find((a) => matchesCode(a, code)) ?? null)
      : airportParam(code)
        ? await apiGet<Airport>(`/airports/${encodeURIComponent(airportParam(code) ?? "")}`)
        : null;
  if (!base) return null;
  try {
    return await enrichAirport(base);
  } catch {
    // Reference data is an enhancement; fall back to the platform record if the provider fails.
    return base;
  }
}

/** Free-text lookup used by search boxes: exact code match first, then name/city matches. */
export async function searchAirports(q: string, limit = 8): Promise<Airport[]> {
  const needle = q.trim();
  if (!needle) return [];
  const exact = await getAirport(needle);
  const rest = (await listAirports({ q: needle, pageSize: limit })).items.filter((a) => a.icao !== exact?.icao);
  return (exact ? [exact, ...rest] : rest).slice(0, limit);
}

export async function getNearbyAirports(code: string, radiusKm = 150, limit = 10): Promise<{ origin: Airport | null; results: NearbyAirport[] }> {
  const origin = await getAirport(code);
  if (!origin) return { origin: null, results: [] };
  if (config.DATA_SOURCE === "api") {
    const results = (await apiGet<NearbyAirport[]>(`/airports/${origin.icao}/nearby${buildQuery({ radiusKm, limit })}`)) ?? [];
    return { origin, results };
  }
  const results = AIRPORTS.filter((a) => a.icao !== origin.icao)
    .map((a) => ({
      airport: a,
      distanceKm: haversineKm(origin.lat, origin.lon, a.lat, a.lon),
      bearingDeg: bearingDeg(origin.lat, origin.lon, a.lat, a.lon),
    }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
  return { origin, results };
}

export interface DistanceResult {
  from: Airport;
  to: Airport;
  distanceKm: number;
  distanceNm: number;
  distanceMi: number;
  bearingDeg: number;
  speedKts: number;
  flightTimeMinutes: number;
}

const DEFAULT_CRUISE_KTS = 450;

/** Airport-to-airport distance (GET /airports/distance in API mode). */
export async function getDistance(fromCode: string, toCode: string, speedKts = DEFAULT_CRUISE_KTS): Promise<DistanceResult | null> {
  if (config.DATA_SOURCE === "api") {
    const from = airportParam(fromCode);
    const to = airportParam(toCode);
    if (!from || !to) return null;
    return apiGet<DistanceResult>(`/airports/distance${buildQuery({ from, to, speedKts })}`);
  }
  const [from, to] = await Promise.all([getAirport(fromCode), getAirport(toCode)]);
  if (!from || !to) return null;
  const distanceKm = haversineKm(from.lat, from.lon, to.lat, to.lon);
  const distanceNm = distanceKm * KM_TO_NM;
  return {
    from,
    to,
    distanceKm,
    distanceNm,
    distanceMi: distanceKm * KM_TO_MI,
    bearingDeg: bearingDeg(from.lat, from.lon, to.lat, to.lon),
    speedKts,
    flightTimeMinutes: Math.round((distanceNm / speedKts) * 60),
  };
}
