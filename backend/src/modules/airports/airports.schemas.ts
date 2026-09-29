import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";
import { CONTINENTS } from "../catalog/categories.js";

const upper = (s: string) => s.toUpperCase();

/** ICAO (4) or IATA (3) code, case-insensitive. */
export const airportCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{3,4}$/, "Enter a 3-letter IATA or 4-letter ICAO code")
  .transform(upper);

export const icaoCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4}$/, "Enter a 4-character ICAO code")
  .transform(upper);

export const iataCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{3}$/, "Enter a 3-character IATA code")
  .transform(upper);

export const countryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, "Enter a 2-letter country code")
  .transform(upper);

export const codeParams = z.object({ code: airportCode });
export const icaoParams = z.object({ icao: icaoCode });

export const listAirportsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  continent: z.enum(CONTINENTS).optional(),
  country: countryCode.optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});
export type ListAirportsQuery = z.infer<typeof listAirportsQuery>;

export const nearbyQuery = z.object({
  radiusKm: z.coerce.number().min(1).max(1000).default(150),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const distanceQuery = z.object({
  from: airportCode,
  to: airportCode,
  /** Cruise speed for the flight-time estimate (knots). */
  speedKts: z.coerce.number().int().min(60).max(700).default(450),
});

export const adminListAirportsQuery = listAirportsQuery.extend({
  featured: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sort: z.enum(["icao", "name", "services", "newest"]).default("icao"),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminListAirportsQuery = z.infer<typeof adminListAirportsQuery>;

const text = (max: number) => z.string().trim().max(max);
/** Site-relative path (served by the frontend) or an absolute http(s) URL. */
const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^\/[^/]/.test(v) || /^https?:\/\//i.test(v), "Use a site path (/images/…) or an http(s) URL");

const runway = z.object({
  designator: text(20).min(1),
  lengthFt: z.number().int().min(0).max(30_000),
  widthFt: z.number().int().min(0).max(1_000),
  surface: text(40).min(1),
  lighting: z.boolean().optional(),
  headingDeg: z.number().min(0).max(360),
  ils: text(20).optional(),
});

const frequency = z.object({
  type: text(20).min(1),
  description: text(80).min(1),
  mhz: z
    .string()
    .trim()
    .regex(/^\d{2,4}(\.\d{1,3})?$/, "Enter a frequency like 118.505"),
});

const airportFields = {
  iata: z.union([iataCode, z.literal(""), z.null()]).optional(),
  name: text(150).min(2),
  shortName: text(80).min(2),
  city: text(80).min(1),
  region: text(120).optional(),
  country: text(80).min(2),
  countryCode,
  continent: z.enum(CONTINENTS),
  type: z.enum(["large_airport", "medium_airport", "small_airport"]),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  elevationFt: z.number().int().min(-1_500).max(30_000).optional(),
  timezone: text(60).optional(),
  utcOffset: z
    .string()
    .trim()
    .regex(/^UTC([+-]\d{1,2}(:\d{2})?)?$/, "Use a format like UTC+5:30")
    .optional(),
  image: imagePath.optional(),
  serviceTags: z.array(text(30).min(1)).max(20).optional(),
  runways: z.array(runway).max(20).optional(),
  frequencies: z.array(frequency).max(40).optional(),
  fireCategory: text(20).optional(),
  operatingHours: text(120).optional(),
  customs: z.boolean().optional(),
  featured: z.boolean().optional(),
};

export const createAirportBody = z.object({ icao: icaoCode, ...airportFields });
export type CreateAirportInput = z.infer<typeof createAirportBody>;

/** ICAO is the stable key other records point at, so it can't be changed. */
export const updateAirportBody = z
  .object(airportFields)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type UpdateAirportInput = z.infer<typeof updateAirportBody>;
