import { z } from "zod";
import type { Airport } from "@/lib/types";

/** Mirrors backend/src/modules/airports/airports.schemas.ts (create/update). The API re-validates. */

export const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "Antarctica"] as const;
export const AIRPORT_TYPES = [
  { value: "large_airport", label: "Large airport" },
  { value: "medium_airport", label: "Medium airport" },
  { value: "small_airport", label: "Small airport" },
] as const;

export interface AdminAirport extends Airport {
  id: string;
  createdAt: string;
  updatedAt: string;
}

const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const num = (min: number, max: number) => z.number({ error: "Enter a number" }).min(min, `Minimum ${min}`).max(max, `Maximum ${max}`);
const int = (min: number, max: number) => num(min, max).int("Enter a whole number");

export const airportSchema = z.object({
  icao: z.string().trim().regex(/^[A-Za-z0-9]{4}$/, "Enter a 4-character ICAO code").optional(),
  iata: z.union([z.string().trim().regex(/^[A-Za-z0-9]{3}$/, "Enter a 3-character IATA code"), z.literal("")]),
  name: text(150).min(2, "Enter at least 2 characters"),
  shortName: text(80).min(2, "Enter at least 2 characters"),
  city: text(80).min(1, "Enter the city"),
  region: text(120),
  country: text(80).min(2, "Enter the country"),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/, "Enter a 2-letter country code"),
  continent: z.enum(CONTINENTS, { error: "Choose a continent" }),
  type: z.enum(["large_airport", "medium_airport", "small_airport"]),
  lat: num(-90, 90),
  lon: num(-180, 180),
  elevationFt: int(-1_500, 30_000).optional(),
  timezone: text(60),
  utcOffset: z.union([z.string().trim().regex(/^UTC([+-]\d{1,2}(:\d{2})?)?$/, "Use a format like UTC+5:30"), z.literal("")]),
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^\/[^/]/.test(v) || /^https?:\/\//i.test(v), "Use a site path (/images/…) or an http(s) URL"),
  serviceTags: z.array(text(30).min(1)).max(20),
  runways: z
    .array(
      z.object({
        designator: text(20).min(1, "Required"),
        lengthFt: int(0, 30_000),
        widthFt: int(0, 1_000),
        surface: text(40).min(1, "Required"),
        lighting: z.boolean(),
        headingDeg: num(0, 360),
        ils: text(20),
      }),
    )
    .max(20),
  frequencies: z
    .array(
      z.object({
        type: text(20).min(1, "Required"),
        description: text(80).min(1, "Required"),
        mhz: z
          .string()
          .trim()
          .regex(/^\d{2,4}(\.\d{1,3})?$/, "Enter a frequency like 118.505"),
      }),
    )
    .max(40),
  fireCategory: text(20),
  operatingHours: text(120),
  trafficPermitted: text(80),
  lightIntensity: text(80),
  deicing: text(80),
  airportCategory: text(80),
  slotsRequired: text(80),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Enter a full web address starting with http:// or https://"),
  customs: z.boolean(),
  featured: z.boolean(),
});

export interface RunwayRow {
  designator: string;
  lengthFt: string;
  widthFt: string;
  surface: string;
  lighting: boolean;
  headingDeg: string;
  ils: string;
}
export interface FrequencyRow {
  type: string;
  description: string;
  mhz: string;
}

export interface AirportFormState {
  icao: string;
  iata: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  continent: string;
  type: "large_airport" | "medium_airport" | "small_airport";
  lat: string;
  lon: string;
  elevationFt: string;
  timezone: string;
  utcOffset: string;
  image: string;
  serviceTags: string[];
  runways: RunwayRow[];
  frequencies: FrequencyRow[];
  fireCategory: string;
  operatingHours: string;
  trafficPermitted: string;
  lightIntensity: string;
  deicing: string;
  airportCategory: string;
  slotsRequired: string;
  website: string;
  customs: boolean;
  featured: boolean;
}

export function emptyAirportState(): AirportFormState {
  return {
    icao: "",
    iata: "",
    name: "",
    shortName: "",
    city: "",
    region: "",
    country: "",
    countryCode: "",
    continent: "",
    type: "medium_airport",
    lat: "",
    lon: "",
    elevationFt: "",
    timezone: "",
    utcOffset: "",
    image: "",
    serviceTags: [],
    runways: [],
    frequencies: [],
    fireCategory: "",
    operatingHours: "",
    trafficPermitted: "",
    lightIntensity: "",
    deicing: "",
    airportCategory: "",
    slotsRequired: "",
    website: "",
    customs: false,
    featured: false,
  };
}

export function stateFromAirport(a: AdminAirport): AirportFormState {
  return {
    icao: a.icao,
    iata: a.iata,
    name: a.name,
    shortName: a.shortName,
    city: a.city,
    region: a.region,
    country: a.country,
    countryCode: a.countryCode,
    continent: a.continent,
    type: a.type,
    lat: String(a.lat),
    lon: String(a.lon),
    elevationFt: String(a.elevationFt),
    timezone: a.timezone,
    utcOffset: a.utcOffset,
    image: a.image,
    serviceTags: a.serviceTags,
    runways: a.runways.map((r) => ({
      designator: r.designator,
      lengthFt: String(r.lengthFt),
      widthFt: String(r.widthFt),
      surface: r.surface,
      lighting: r.lighting,
      headingDeg: String(r.headingDeg),
      ils: r.ils ?? "",
    })),
    frequencies: a.frequencies.map((f) => ({ ...f })),
    fireCategory: a.fireCategory,
    operatingHours: a.operatingHours,
    // Airports saved before these fields existed come back without them.
    trafficPermitted: a.trafficPermitted ?? "",
    lightIntensity: a.lightIntensity ?? "",
    deicing: a.deicing ?? "",
    airportCategory: a.airportCategory ?? "",
    slotsRequired: a.slotsRequired ?? "",
    website: a.website ?? "",
    customs: a.customs,
    featured: a.featured,
  };
}

const toNum = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

export function rawAirportPayload(s: AirportFormState, mode: "create" | "edit"): Record<string, unknown> {
  return {
    ...(mode === "create" ? { icao: s.icao } : {}),
    iata: s.iata,
    name: s.name,
    shortName: s.shortName,
    city: s.city,
    region: s.region,
    country: s.country,
    countryCode: s.countryCode,
    continent: s.continent || undefined,
    type: s.type,
    lat: toNum(s.lat),
    lon: toNum(s.lon),
    elevationFt: toNum(s.elevationFt),
    timezone: s.timezone,
    utcOffset: s.utcOffset,
    image: s.image,
    serviceTags: s.serviceTags,
    runways: s.runways.map((r) => ({ ...r, lengthFt: toNum(r.lengthFt), widthFt: toNum(r.widthFt), headingDeg: toNum(r.headingDeg) })),
    frequencies: s.frequencies,
    fireCategory: s.fireCategory,
    operatingHours: s.operatingHours,
    trafficPermitted: s.trafficPermitted,
    lightIntensity: s.lightIntensity,
    deicing: s.deicing,
    airportCategory: s.airportCategory,
    slotsRequired: s.slotsRequired,
    website: s.website,
    customs: s.customs,
    featured: s.featured,
  };
}

/** Drops empty optional strings the API would reject (utcOffset/timezone/ils) so the server keeps its defaults. */
export function airportRequestBody(p: z.infer<typeof airportSchema>): Record<string, unknown> {
  const { utcOffset, timezone, runways, ...rest } = p;
  return {
    ...rest,
    ...(utcOffset ? { utcOffset } : {}),
    ...(timezone ? { timezone } : {}),
    runways: runways.map(({ ils, ...r }) => (ils ? { ...r, ils } : r)),
  };
}
