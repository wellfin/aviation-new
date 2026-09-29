import "server-only";
import { config } from "@/lib/config";
import { fetchJson } from "@/lib/data/http";
import type { Airport, Frequency, Runway } from "@/lib/types";

/**
 * OpenAIP (https://www.openaip.net) — aeronautical reference data.
 * Used when AIRPORT_DATA_PROVIDER=openaip (requires OPENAIP_API_KEY).
 */

const API = "https://api.core.openaip.net/api";

interface Measure {
  value: number;
  /** 0 = metres, 1 = feet. */
  unit: number;
}

interface OpenAipRunway {
  designator: string;
  trueHeading?: number;
  dimension?: { length?: Measure; width?: Measure };
  surface?: { mainComposite?: number };
  pilotCtrlLighting?: boolean;
  instrumentApproach?: boolean;
}

interface OpenAipFrequency {
  value: string;
  type?: number;
  name?: string;
}

export interface OpenAipAirport {
  _id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  geometry?: { coordinates?: [number, number] };
  elevation?: Measure;
  runways?: OpenAipRunway[];
  frequencies?: OpenAipFrequency[];
}

const SURFACES: Record<number, string> = {
  0: "Asphalt",
  1: "Concrete",
  2: "Grass",
  3: "Sand",
  4: "Water",
  5: "Bituminous",
  6: "Brick",
  7: "Macadam",
  8: "Stone",
  9: "Coral",
  10: "Clay",
  11: "Laterite",
  12: "Gravel",
  13: "Earth",
  14: "Ice",
  15: "Snow",
  16: "Rubber",
  17: "Metal",
  20: "Wood",
};

const FREQUENCY_TYPES: Record<number, string> = {
  0: "APP",
  1: "APRON",
  2: "ARR",
  3: "CTR",
  4: "CTAF",
  5: "DEL",
  6: "DEP",
  7: "FIS",
  9: "GND",
  10: "INFO",
  12: "UNICOM",
  13: "RADAR",
  14: "TWR",
  15: "ATIS",
  16: "RADIO",
  19: "AWOS",
  21: "VOLMET",
  22: "AFIS",
};

const toFeet = (m: Measure | undefined): number => (m ? Math.round(m.unit === 1 ? m.value : m.value * 3.28084) : 0);

/** OpenAIP lists each runway direction separately (09L, 27R); pair reciprocal ends into "09L/27R". */
export function pairRunways(runways: OpenAipRunway[]): Runway[] {
  const used = new Set<number>();
  const out: Runway[] = [];
  runways.forEach((r, i) => {
    if (used.has(i)) return;
    used.add(i);
    const heading = r.trueHeading ?? 0;
    const j = runways.findIndex(
      // Reciprocal end: headings ~180° apart.
      (o, k) => !used.has(k) && o.trueHeading !== undefined && Math.abs(((o.trueHeading - heading + 360) % 360) - 180) < 10,
    );
    const pair = j >= 0 ? runways[j] : undefined;
    if (j >= 0) used.add(j);
    // Show the lower-numbered end first, as charts do.
    const [a, b] = pair && pair.designator < r.designator ? [pair, r] : [r, pair];
    out.push({
      designator: b ? `${a.designator}/${b.designator}` : a.designator,
      lengthFt: toFeet(r.dimension?.length),
      widthFt: toFeet(r.dimension?.width),
      surface: SURFACES[r.surface?.mainComposite ?? -1] ?? "Unknown",
      lighting: Boolean(r.pilotCtrlLighting || r.instrumentApproach),
      headingDeg: Math.round(a.trueHeading ?? heading),
      ...(r.instrumentApproach || pair?.instrumentApproach ? { ils: "ILS" } : {}),
    });
  });
  return out;
}

export function mapFrequencies(freqs: OpenAipFrequency[]): Frequency[] {
  return freqs.map((f) => ({ type: FREQUENCY_TYPES[f.type ?? -1] ?? "COM", description: f.name ?? "", mhz: f.value }));
}

export async function findOpenAipAirport(icao: string): Promise<OpenAipAirport | null> {
  if (!config.OPENAIP_API_KEY) throw new Error("OPENAIP_API_KEY is not configured");
  const res = await fetchJson<{ items?: OpenAipAirport[] }>(`${API}/airports?search=${encodeURIComponent(icao)}&limit=5`, {
    headers: { "x-openaip-api-key": config.OPENAIP_API_KEY },
    revalidate: 86_400,
  });
  return res.items?.find((a) => a.icaoCode?.toUpperCase() === icao.toUpperCase()) ?? null;
}

/** Overlays OpenAIP runways, frequencies, coordinates and elevation on the platform record. */
export async function enrichFromOpenAip(base: Airport): Promise<Airport> {
  // Not configured yet: keep the platform record rather than failing every request.
  if (!config.OPENAIP_API_KEY) return base;
  const a = await findOpenAipAirport(base.icao);
  if (!a) return base;
  const [lon, lat] = a.geometry?.coordinates ?? [base.lon, base.lat];
  const runways = pairRunways(a.runways ?? []);
  const frequencies = mapFrequencies(a.frequencies ?? []);
  return {
    ...base,
    lat,
    lon,
    elevationFt: a.elevation ? toFeet(a.elevation) : base.elevationFt,
    runways: runways.length ? runways : base.runways,
    frequencies: frequencies.length ? frequencies : base.frequencies,
  };
}
