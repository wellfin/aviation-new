import type { ClientSession, PipelineStage } from "mongoose";
import { isDuplicateKeyError, withTransaction } from "../../lib/db.js";
import { conflict, notFound } from "../../lib/errors.js";
import { containsRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { Provider } from "../providers/provider.model.js";
import { Airport, type AirportAttrs, type AirportDoc, type AirportDTO, toAirportDTO } from "./airport.model.js";
import type { AdminListAirportsQuery, CreateAirportInput, ListAirportsQuery, UpdateAirportInput } from "./airports.schemas.js";

const EARTH_RADIUS_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Great-circle distance — same formula the frontend uses, so both agree to the metre. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Initial true bearing from point 1 to point 2, 0–360°. */
export function initialBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

type AirportRecord = AirportAttrs & { _id: unknown };

function coords(a: AirportRecord): { lat: number; lon: number } {
  const [lon = 0, lat = 0] = (a.location?.coordinates ?? []) as number[];
  return { lat, lon };
}

function legBetween(from: AirportRecord, to: AirportRecord) {
  const a = coords(from);
  const b = coords(to);
  return { distanceKm: round1(haversineKm(a.lat, a.lon, b.lat, b.lon)), bearingDeg: round1(initialBearingDeg(a.lat, a.lon, b.lat, b.lon)) };
}

/** Exact code lookup: 4 characters → ICAO, 3 → IATA. */
export function findByCode(code: string, session?: ClientSession) {
  const c = code.toUpperCase();
  return Airport.findOne(c.length === 4 ? { icao: c } : { iata: c }).session(session ?? null);
}

async function requireAirport(code: string): Promise<AirportDoc> {
  const airport = await findByCode(code);
  if (!airport) throw notFound("Airport");
  return airport;
}

function searchFilter(query: Pick<ListAirportsQuery, "q" | "continent" | "country">): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.continent) filter.continent = query.continent;
  if (query.country) filter.countryCode = query.country;
  if (query.q) {
    const code = query.q.toUpperCase();
    const rx = containsRegex(query.q);
    filter.$or = [{ icao: code }, { iata: code }, { name: rx }, { shortName: rx }, { city: rx }, { country: rx }];
  }
  return filter;
}

/**
 * Public search. An exact ICAO/IATA hit is always ranked first so typing a code
 * lands on that airport; the rest follow by prominence.
 */
export async function listAirports(query: ListAirportsQuery): Promise<Paginated<AirportDTO>> {
  const filter = searchFilter(query);
  const code = query.q?.toUpperCase() ?? "";
  const pipeline: PipelineStage[] = [
    { $match: filter },
    { $addFields: { _exact: { $cond: [{ $or: [{ $eq: ["$icao", code] }, { $eq: ["$iata", code] }] }, 1, 0] } } },
    { $sort: { _exact: -1, featured: -1, servicesCount: -1, icao: 1 } },
    {
      $facet: {
        items: [{ $skip: skipFor(query.page, query.pageSize) }, { $limit: query.pageSize }],
        total: [{ $count: "n" }],
      },
    },
  ];
  const [result] = await Airport.aggregate<{ items: AirportRecord[]; total: Array<{ n: number }> }>(pipeline);
  const items = (result?.items ?? []).map(toAirportDTO);
  return paginated(items, result?.total[0]?.n ?? 0, query.page, query.pageSize);
}

export async function featuredAirports(): Promise<AirportDTO[]> {
  const docs = await Airport.find({ featured: true }).sort({ servicesCount: -1, icao: 1 }).limit(24).lean();
  return docs.map(toAirportDTO);
}

export async function getAirport(code: string): Promise<AirportDTO> {
  return toAirportDTO(await requireAirport(code));
}

/** Airports within `radiusKm` of the origin, nearest first (uses the 2dsphere index). */
export async function nearbyAirports(code: string, radiusKm: number, limit: number) {
  const origin = await requireAirport(code);
  const originAt = coords(origin);
  const rows = await Airport.aggregate<AirportRecord>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [originAt.lon, originAt.lat] },
        distanceField: "_distanceM",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: { icao: { $ne: origin.icao } },
      },
    },
    { $limit: limit },
  ]);
  return rows.map((a) => ({ airport: toAirportDTO(a), ...legBetween(origin, a) })).filter((r) => r.distanceKm <= radiusKm);
}

const KM_PER_NM = 1.852;
const KM_PER_MI = 1.609344;

/**
 * Airport-to-airport great-circle leg: distance in km / NM / statute miles,
 * initial true bearing and an estimated flight time at `speedKts` (still air,
 * no climb/descent allowance).
 */
export async function distanceBetween(fromCode: string, toCode: string, speedKts = 450) {
  const [from, to] = await Promise.all([requireAirport(fromCode), requireAirport(toCode)]);
  const leg = legBetween(from, to);
  const distanceNm = leg.distanceKm / KM_PER_NM;
  return {
    from: toAirportDTO(from),
    to: toAirportDTO(to),
    ...leg,
    distanceNm: round1(distanceNm),
    distanceMi: round1(leg.distanceKm / KM_PER_MI),
    speedKts,
    flightTimeMinutes: Math.round((distanceNm / speedKts) * 60),
  };
}

/**
 * Sets `servicesCount` on each airport to the number of PUBLISHED providers
 * serving it. Call whenever a provider's status or airports change.
 */
export async function recountAirportServices(icaos: string[], session?: ClientSession): Promise<void> {
  const codes = [...new Set(icaos.map((c) => c.toUpperCase()))];
  if (codes.length === 0) return;
  const counts = await Provider.aggregate<{ _id: string; n: number }>([
    { $match: { status: "published", airportCodes: { $in: codes } } },
    { $unwind: "$airportCodes" },
    { $match: { airportCodes: { $in: codes } } },
    { $group: { _id: "$airportCodes", n: { $sum: 1 } } },
  ]).session(session ?? null);
  const byCode = new Map(counts.map((c) => [c._id, c.n]));
  await Airport.bulkWrite(
    codes.map((icao) => ({ updateOne: { filter: { icao }, update: { $set: { servicesCount: byCode.get(icao) ?? 0 } } } })),
    { session },
  );
}

/* ----------------------------------------------------------------- admin -- */

export function toAdminAirportDTO(a: AirportDoc) {
  return { ...toAirportDTO(a), id: a.id, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}

const ADMIN_SORTS = {
  icao: { icao: 1 },
  name: { name: 1 },
  services: { servicesCount: -1, icao: 1 },
  newest: { createdAt: -1 },
} as const;

export async function adminListAirports(query: AdminListAirportsQuery) {
  const filter = searchFilter(query);
  if (query.featured !== undefined) filter.featured = query.featured;
  const [items, total] = await Promise.all([
    Airport.find(filter).sort(ADMIN_SORTS[query.sort]).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
    Airport.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminAirportDTO), total, query.page, query.pageSize);
}

export async function adminGetAirport(icao: string) {
  const airport = await Airport.findOne({ icao });
  if (!airport) throw notFound("Airport");
  return toAdminAirportDTO(airport);
}

/** Copies whitelisted fields onto the document (lat/lon become the GeoJSON point). */
function applyFields(doc: AirportDoc, input: UpdateAirportInput): void {
  const { lat, lon, iata, ...rest } = input;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) doc.set(key, value);
  }
  if (iata !== undefined) doc.set("iata", iata || undefined);
  if (lat !== undefined || lon !== undefined) {
    const current = coords(doc);
    doc.set("location", { type: "Point", coordinates: [lon ?? current.lon, lat ?? current.lat] });
  }
}

function duplicateCode(err: unknown): never {
  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0] === "iata" ? "iata" : "icao";
    throw conflict(`An airport with this ${field.toUpperCase()} code already exists.`, { [field]: "Already in use" });
  }
  throw err;
}

export async function createAirport(input: CreateAirportInput) {
  const doc = new Airport({ icao: input.icao, location: { type: "Point", coordinates: [input.lon, input.lat] } });
  applyFields(doc, input);
  try {
    await doc.save();
  } catch (err) {
    duplicateCode(err);
  }
  return toAdminAirportDTO(doc);
}

/** Updates an airport; an IATA change is propagated to providers' denormalised airport codes. */
export async function updateAirport(icao: string, input: UpdateAirportInput) {
  try {
    return await withTransaction(async (session) => {
      const doc = await Airport.findOne({ icao }).session(session);
      if (!doc) throw notFound("Airport");
      const oldIata = doc.iata ?? "";
      applyFields(doc, input);
      await doc.save({ session });
      const newIata = doc.iata ?? "";
      if (oldIata !== newIata) {
        if (oldIata) await Provider.updateMany({ airports: doc._id }, { $pull: { airportCodes: oldIata } }, { session });
        if (newIata) await Provider.updateMany({ airports: doc._id }, { $addToSet: { airportCodes: newIata } }, { session });
      }
      return toAdminAirportDTO(doc);
    });
  } catch (err) {
    return duplicateCode(err);
  }
}

/** Refuses to delete an airport that listings still reference, so no provider is left pointing at nothing. */
export async function deleteAirport(icao: string): Promise<void> {
  await withTransaction(async (session) => {
    const doc = await Airport.findOne({ icao }).session(session);
    if (!doc) throw notFound("Airport");
    const inUse = await Provider.countDocuments({ airports: doc._id }).session(session);
    if (inUse > 0) {
      throw conflict(`This airport is used by ${inUse} provider listing${inUse === 1 ? "" : "s"}. Remove it from them first.`, undefined, "AIRPORT_IN_USE");
    }
    await doc.deleteOne({ session });
  });
}
