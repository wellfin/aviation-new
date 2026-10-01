import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";
import { CONTINENTS } from "../catalog/categories.js";

const runwaySchema = new Schema(
  {
    designator: { type: String, required: true, trim: true, maxlength: 20 },
    lengthFt: { type: Number, required: true, min: 0, max: 30_000 },
    widthFt: { type: Number, required: true, min: 0, max: 1_000 },
    surface: { type: String, required: true, trim: true, maxlength: 40 },
    lighting: { type: Boolean, default: false },
    headingDeg: { type: Number, required: true, min: 0, max: 360 },
    ils: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const frequencySchema = new Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 20 },
    description: { type: String, required: true, trim: true, maxlength: 80 },
    mhz: { type: String, required: true, trim: true, maxlength: 12 },
  },
  { _id: false },
);

const airportSchema = new Schema(
  {
    icao: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z0-9]{4}$/ },
    iata: { type: String, uppercase: true, trim: true, match: /^[A-Z0-9]{3}$/ },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    shortName: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 120, default: "" },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    countryCode: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
    continent: { type: String, required: true, enum: CONTINENTS },
    type: { type: String, enum: ["large_airport", "medium_airport", "small_airport"], required: true },
    /** GeoJSON point: [longitude, latitude]. */
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => v.length === 2 && Math.abs(v[0]!) <= 180 && Math.abs(v[1]!) <= 90,
          message: "Invalid coordinates",
        },
      },
    },
    elevationFt: { type: Number, default: 0 },
    timezone: { type: String, trim: true, maxlength: 60, default: "UTC" },
    utcOffset: { type: String, trim: true, maxlength: 12, default: "UTC+0" },
    image: { type: String, trim: true, maxlength: 500, default: "" },
    serviceTags: [{ type: String, trim: true, maxlength: 30 }],
    runways: [runwaySchema],
    frequencies: [frequencySchema],
    fireCategory: { type: String, trim: true, maxlength: 20, default: "" },
    operatingHours: { type: String, trim: true, maxlength: 120, default: "" },
    /* Operational details shown under "More Airport Information" (all optional free text). */
    trafficPermitted: { type: String, trim: true, maxlength: 80, default: "" },
    lightIntensity: { type: String, trim: true, maxlength: 80, default: "" },
    deicing: { type: String, trim: true, maxlength: 80, default: "" },
    airportCategory: { type: String, trim: true, maxlength: 80, default: "" },
    slotsRequired: { type: String, trim: true, maxlength: 80, default: "" },
    website: { type: String, trim: true, maxlength: 200, default: "" },
    /* Facilities shown on the "Airport Services" tab (optional free text). */
    cargoHandling: { type: String, trim: true, maxlength: 120, default: "" },
    hangarSpace: { type: String, trim: true, maxlength: 120, default: "" },
    restaurants: { type: String, trim: true, maxlength: 120, default: "" },
    medicalFacilities: { type: String, trim: true, maxlength: 120, default: "" },
    customs: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    /** Number of published providers at this airport (denormalised; see recountAirportServices). */
    servicesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

airportSchema.index({ icao: 1 }, { unique: true });
airportSchema.index({ iata: 1 }, { unique: true, sparse: true });
airportSchema.index({ location: "2dsphere" });
airportSchema.index({ continent: 1, countryCode: 1 });
airportSchema.index({ featured: 1 });
airportSchema.index({ name: "text", shortName: "text", city: "text", country: "text" });

export type AirportAttrs = InferSchemaType<typeof airportSchema>;
export type AirportDoc = HydratedDocument<AirportAttrs>;
export const Airport = model("Airport", airportSchema);

/** Response shape — matches the frontend `Airport` type. */
export function toAirportDTO(a: AirportDoc | (AirportAttrs & { _id: unknown })) {
  const [lon = 0, lat = 0] = (a.location?.coordinates ?? []) as number[];
  return {
    icao: a.icao,
    iata: a.iata ?? "",
    name: a.name,
    shortName: a.shortName,
    city: a.city,
    region: a.region ?? "",
    country: a.country,
    countryCode: a.countryCode,
    continent: a.continent,
    type: a.type,
    lat,
    lon,
    elevationFt: a.elevationFt ?? 0,
    timezone: a.timezone ?? "UTC",
    utcOffset: a.utcOffset ?? "UTC+0",
    image: a.image ?? "",
    servicesCount: a.servicesCount ?? 0,
    serviceTags: a.serviceTags ?? [],
    runways: (a.runways ?? []).map((r) => ({
      designator: r.designator,
      lengthFt: r.lengthFt,
      widthFt: r.widthFt,
      surface: r.surface,
      lighting: Boolean(r.lighting),
      headingDeg: r.headingDeg,
      ...(r.ils ? { ils: r.ils } : {}),
    })),
    frequencies: (a.frequencies ?? []).map((f) => ({ type: f.type, description: f.description, mhz: f.mhz })),
    fireCategory: a.fireCategory ?? "",
    operatingHours: a.operatingHours ?? "",
    trafficPermitted: a.trafficPermitted ?? "",
    lightIntensity: a.lightIntensity ?? "",
    deicing: a.deicing ?? "",
    airportCategory: a.airportCategory ?? "",
    slotsRequired: a.slotsRequired ?? "",
    website: a.website ?? "",
    cargoHandling: a.cargoHandling ?? "",
    hangarSpace: a.hangarSpace ?? "",
    restaurants: a.restaurants ?? "",
    medicalFacilities: a.medicalFacilities ?? "",
    customs: Boolean(a.customs),
    featured: Boolean(a.featured),
  };
}
export type AirportDTO = ReturnType<typeof toAirportDTO>;
