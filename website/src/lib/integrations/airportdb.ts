import "server-only";
import { config } from "@/lib/config";
import { fetchJson } from "@/lib/data/http";
import type { Airport } from "@/lib/types";
import { enrichFromOpenAip } from "./openaip";

/**
 * Airport reference data enrichment (runways, frequencies, coordinates).
 *  - AIRPORT_DATA_PROVIDER=mock      → use the platform/mock record as-is (default)
 *  - AIRPORT_DATA_PROVIDER=airportdb → https://airportdb.io (AIRPORTDB_API_TOKEN)
 *  - AIRPORT_DATA_PROVIDER=openaip   → https://www.openaip.net (OPENAIP_API_KEY)
 */

interface AirportDbResponse {
  icao_code: string;
  iata_code: string;
  name: string;
  type: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  municipality: string;
  iso_country: string;
  country?: { name: string };
  region?: { name: string };
  runways: Array<{
    le_ident: string;
    he_ident: string;
    length_ft: string;
    width_ft: string;
    surface: string;
    lighted: string;
    le_heading_degT: string;
  }>;
  freqs: Array<{ type: string; description: string; frequency_mhz: string }>;
}

export async function enrichAirport(base: Airport): Promise<Airport> {
  if (config.AIRPORT_DATA_PROVIDER === "openaip") return enrichFromOpenAip(base);
  if (config.AIRPORT_DATA_PROVIDER !== "airportdb") return base;
  if (!config.AIRPORTDB_API_TOKEN) throw new Error("AIRPORTDB_API_TOKEN is not configured");

  const a = await fetchJson<AirportDbResponse>(
    `https://airportdb.io/api/v1/airport/${base.icao}?apiToken=${encodeURIComponent(config.AIRPORTDB_API_TOKEN)}`,
    { revalidate: 86_400 },
  );
  return {
    ...base,
    name: a.name || base.name,
    lat: Number.parseFloat(a.latitude_deg) || base.lat,
    lon: Number.parseFloat(a.longitude_deg) || base.lon,
    elevationFt: Number.parseInt(a.elevation_ft, 10) || base.elevationFt,
    runways: a.runways.length
      ? a.runways.map((r) => ({
          designator: `${r.le_ident}/${r.he_ident}`,
          lengthFt: Number.parseInt(r.length_ft, 10) || 0,
          widthFt: Number.parseInt(r.width_ft, 10) || 0,
          surface: r.surface,
          lighting: r.lighted === "1",
          headingDeg: Number.parseFloat(r.le_heading_degT) || 0,
        }))
      : base.runways,
    frequencies: a.freqs.length
      ? a.freqs.map((f) => ({ type: f.type, description: f.description, mhz: f.frequency_mhz }))
      : base.frequencies,
  };
}
