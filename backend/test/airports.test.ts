import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { Airport } from "../src/modules/airports/airport.model.js";
import { adminAirportsRouter, airportsRouter } from "../src/modules/airports/airports.routes.js";
import { seedAirports } from "../src/modules/airports/airports.seed.js";
import { haversineKm, initialBearingDeg, recountAirportServices } from "../src/modules/airports/airports.service.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/airports", airportsRouter], ["/admin/airports", adminAirportsRouter]);
const pub = (p: string) => `/api/v1/airports${p}`;
const adm = (p: string) => `/api/v1/admin/airports${p}`;

const NEW_AIRPORT = {
  icao: "lszh",
  iata: "zrh",
  name: "Zurich Airport",
  shortName: "Zurich",
  city: "Zurich",
  country: "Switzerland",
  countryCode: "ch",
  continent: "Europe",
  type: "large_airport",
  lat: 47.4647,
  lon: 8.5492,
  runways: [{ designator: "14/32", lengthFt: 10827, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 140, ils: "CAT IIIb" }],
  frequencies: [{ type: "TWR", description: "Zurich Tower", mhz: "118.100" }],
};

async function providerAt(icaos: string[], status: "published" | "draft" = "published", slug = `p-${Math.random().toString(36).slice(2, 8)}`) {
  const airports = await Airport.find({ icao: { $in: icaos } });
  return Provider.create({
    slug,
    name: slug,
    status,
    category: "fbo",
    countryCode: "GB",
    country: "United Kingdom",
    city: "London",
    summary: "A test provider listing",
    airports: airports.map((a) => a._id),
    airportCodes: airports.flatMap((a) => [a.icao, a.iata!]),
  });
}

describe("public airports", () => {
  beforeEach(async () => {
    await seedAirports();
  });

  it("seeds idempotently", async () => {
    await seedAirports();
    expect(await Airport.countDocuments()).toBe(15);
  });

  it("lists with pagination and filters, matching the frontend Airport shape", async () => {
    const r = await request(app).get(pub("?pageSize=5&page=2"));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 15, page: 2, pageSize: 5, totalPages: 3 });
    expect(r.body.data.items).toHaveLength(5);
    const a = r.body.data.items[0];
    for (const key of ["icao", "iata", "name", "lat", "lon", "runways", "frequencies", "servicesCount", "featured"]) expect(a).toHaveProperty(key);
    expect(a).not.toHaveProperty("_id");

    const eu = await request(app).get(pub("?continent=Europe&country=gb&pageSize=50"));
    expect(eu.body.data.items.map((x: { icao: string }) => x.icao).sort()).toEqual(["EGGW", "EGKK", "EGLF", "EGLL"]);
    expect((await request(app).get(pub("?continent=Atlantis"))).status).toBe(422);
    expect((await request(app).get(pub("?pageSize=500"))).body.error.fieldErrors).toHaveProperty("pageSize");
  });

  it("ranks exact code matches first, then name/city matches", async () => {
    const byIata = await request(app).get(pub("?q=lhr"));
    expect(byIata.body.data.items[0].icao).toBe("EGLL");
    const london = await request(app).get(pub("?q=London&pageSize=50"));
    expect(london.body.data.items.map((x: { icao: string }) => x.icao)).toEqual(expect.arrayContaining(["EGLL", "EGGW", "EGKK"]));
    expect((await request(app).get(pub("?q=(.*"))).body.data.total).toBe(0);
    expect((await request(app).get(pub("?q=zzzz"))).body.data).toMatchObject({ items: [], total: 0, totalPages: 1 });
  });

  it("returns featured airports", async () => {
    const r = await request(app).get(pub("/featured"));
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(6);
    expect(r.body.data.every((a: { featured: boolean }) => a.featured)).toBe(true);
  });

  it("resolves an airport by ICAO or IATA, case-insensitively", async () => {
    expect((await request(app).get(pub("/egll"))).body.data.iata).toBe("LHR");
    expect((await request(app).get(pub("/dxb"))).body.data.icao).toBe("OMDB");
    expect((await request(app).get(pub("/ZZZZ"))).status).toBe(404);
    expect((await request(app).get(pub("/toolong"))).status).toBe(422);
  });

  it("finds nearby airports with $geoNear, excluding the origin", async () => {
    const r = await request(app).get(pub("/EGLL/nearby?radiusKm=100"));
    expect(r.status).toBe(200);
    const icaos = r.body.data.map((x: { airport: { icao: string } }) => x.airport.icao);
    expect(icaos).not.toContain("EGLL");
    expect(icaos).toEqual(expect.arrayContaining(["EGLF", "EGKK", "EGGW"]));
    const distances = r.body.data.map((x: { distanceKm: number }) => x.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(r.body.data[0].bearingDeg).toBeGreaterThanOrEqual(0);

    expect((await request(app).get(pub("/EGLL/nearby?radiusKm=100&limit=1"))).body.data).toHaveLength(1);
    expect((await request(app).get(pub("/EGLL/nearby?radiusKm=5000"))).status).toBe(422);
    expect((await request(app).get(pub("/EGLL/nearby?limit=0"))).status).toBe(422);
    expect((await request(app).get(pub("/WSSS/nearby"))).body.data).toEqual([]);
    expect((await request(app).get(pub("/ZZZZ/nearby"))).status).toBe(404);
  });

  it("computes distance and bearing between two airports", async () => {
    const r = await request(app).get(pub("/distance?from=LHR&to=kjfk"));
    expect(r.status).toBe(200);
    expect(r.body.data.from.icao).toBe("EGLL");
    expect(r.body.data.to.icao).toBe("KJFK");
    expect(r.body.data.distanceKm).toBeGreaterThan(5500);
    expect(r.body.data.distanceKm).toBeLessThan(5600);
    // Unit conversions and the flight-time estimate (default 450 kt).
    const d = r.body.data;
    expect(d.distanceNm).toBeCloseTo(d.distanceKm / 1.852, 0);
    expect(d.distanceMi).toBeCloseTo(d.distanceKm / 1.609344, 0);
    expect(d.speedKts).toBe(450);
    expect(d.flightTimeMinutes).toBe(Math.round((d.distanceKm / 1.852 / 450) * 60));
    const slow = await request(app).get(pub("/distance?from=LHR&to=KJFK&speedKts=300"));
    expect(slow.body.data.flightTimeMinutes).toBeGreaterThan(d.flightTimeMinutes);
    expect((await request(app).get(pub("/distance?from=LHR&to=KJFK&speedKts=5000"))).status).toBe(422);
    expect((await request(app).get(pub("/distance?from=LHR"))).status).toBe(422);
    expect((await request(app).get(pub("/distance?from=LHR&to=XXX"))).status).toBe(404);
  });

  it("recounts servicesCount from published providers only", async () => {
    await providerAt(["EGLL", "KJFK"]);
    await providerAt(["EGLL"]);
    await providerAt(["EGLL"], "draft");
    await recountAirportServices(["EGLL", "KJFK", "OMDB"]);
    const counts = Object.fromEntries((await Airport.find({ icao: { $in: ["EGLL", "KJFK", "OMDB"] } })).map((a) => [a.icao, a.servicesCount]));
    expect(counts).toEqual({ EGLL: 2, KJFK: 1, OMDB: 0 });
  });
});

describe("geo helpers", () => {
  it("match known values", () => {
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
    expect(initialBearingDeg(0, 0, 1, 0)).toBeCloseTo(0);
    expect(initialBearingDeg(0, 0, 0, 1)).toBeCloseTo(90);
  });
});

describe("admin airports", () => {
  it("requires authentication and the airports:manage permission", async () => {
    expect((await request(app).get(adm(""))).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(adm(""))).status).toBe(401);
      expect((await agent.post(adm("")).send(NEW_AIRPORT)).status).toBe(401);
    }
  });

  it("creates, reads, updates and deletes an airport", async () => {
    const { agent } = await signedInAgent("MANAGER", app);
    const c = await agent.post(adm("")).send(NEW_AIRPORT);
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ icao: "LSZH", iata: "ZRH", countryCode: "CH", lat: 47.4647, lon: 8.5492, servicesCount: 0 });
    expect(c.body.data.id).toBeTruthy();

    expect((await agent.get(adm("/lszh"))).body.data.name).toBe("Zurich Airport");
    const u = await agent.patch(adm("/LSZH")).send({ lat: 47.46, featured: true, iata: "" });
    expect(u.status).toBe(200);
    expect(u.body.data).toMatchObject({ lat: 47.46, lon: 8.5492, featured: true, iata: "" });

    const list = await agent.get(adm("?featured=true"));
    expect(list.body.data.items.map((a: { icao: string }) => a.icao)).toEqual(["LSZH"]);

    expect((await agent.delete(adm("/LSZH"))).status).toBe(204);
    expect((await agent.get(adm("/LSZH"))).status).toBe(404);
    expect((await agent.delete(adm("/LSZH"))).status).toBe(404);
  });

  it("stores the optional operational details and serves them publicly", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const created = await agent.post(adm("")).send(NEW_AIRPORT);
    // Not provided → empty strings, never undefined.
    expect(created.body.data).toMatchObject({ trafficPermitted: "", lightIntensity: "", deicing: "", airportCategory: "", slotsRequired: "", website: "" });
    expect(created.body.data).toMatchObject({ cargoHandling: "", hangarSpace: "", restaurants: "", medicalFacilities: "", runwayDiagram: "", rescueEquipment: "", disabledAircraftRemoval: "" });
    expect(created.body.data.runways[0]).toMatchObject({ pcn: "", coordinates: "", elevation: "", displacedThreshold: "" });

    const details = {
      trafficPermitted: "IFR / VFR",
      lightIntensity: "High (HIRL)",
      deicing: "Available",
      airportCategory: "International",
      slotsRequired: "Yes — coordinated (Level 3)",
      website: "https://www.flughafen-zuerich.ch",
      cargoHandling: "Cargo terminal with customs clearance",
      hangarSpace: "Available on request",
      restaurants: "Landside and airside",
      medicalFacilities: "Airport medical centre",
      rescueEquipment: "3 RFFS vehicles, rescue boat",
      disabledAircraftRemoval: "Up to A380 (recovery kit on site)",
    };
    const u = await agent.patch(adm("/LSZH")).send(details);
    expect(u.status).toBe(200);
    expect(u.body.data).toMatchObject(details);
    expect((await request(app).get(pub("/lszh"))).body.data).toMatchObject(details);

    // Runways tab: the expandable runway details and the diagram image.
    const runway = { ...NEW_AIRPORT.runways[0], pcn: "80/F/A/W/T", coordinates: "N47 28.9 E008 32.2", elevation: "1,402 ft", displacedThreshold: "492 ft" };
    const rw = await agent.patch(adm("/LSZH")).send({ runways: [runway], runwayDiagram: "/images/airports/lszh-chart.png" });
    expect(rw.status).toBe(200);
    expect(rw.body.data.runways[0]).toMatchObject(runway);
    expect((await request(app).get(pub("/lszh"))).body.data).toMatchObject({ runwayDiagram: "/images/airports/lszh-chart.png", runways: [runway] });
    const badDiagram = await agent.patch(adm("/LSZH")).send({ runwayDiagram: "javascript:alert(1)" });
    expect(badDiagram.status).toBe(422);
    expect(badDiagram.body.error.fieldErrors).toHaveProperty("runwayDiagram");

    for (const website of ["flughafen-zuerich.ch", "javascript:alert(1)", "ftp://example.com"]) {
      const bad = await agent.patch(adm("/LSZH")).send({ website });
      expect(bad.status, website).toBe(422);
      expect(bad.body.error.fieldErrors).toHaveProperty("website");
    }
    // Clearing a value is allowed.
    expect((await agent.patch(adm("/LSZH")).send({ website: "", deicing: "" })).body.data).toMatchObject({ website: "", deicing: "" });
  });

  it("validates input with field errors", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const r = await agent.post(adm("")).send({ ...NEW_AIRPORT, icao: "ZZ", lat: 95, continent: "Mars", frequencies: [{ type: "TWR", description: "x", mhz: "abc" }] });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors)).toEqual(expect.arrayContaining(["icao", "lat", "continent", "frequencies.0.mhz"]));
    await agent.post(adm("")).send(NEW_AIRPORT);
    expect((await agent.patch(adm("/LSZH")).send({})).status).toBe(422);
    expect((await agent.patch(adm("/LSZH")).send({ lon: 200 })).status).toBe(422);
  });

  it("rejects duplicate ICAO/IATA codes with 409", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.post(adm("")).send(NEW_AIRPORT)).status).toBe(201);
    const dupIcao = await agent.post(adm("")).send({ ...NEW_AIRPORT, iata: "ZRX" });
    expect(dupIcao.status).toBe(409);
    expect(dupIcao.body.error.fieldErrors).toHaveProperty("icao");
    const dupIata = await agent.post(adm("")).send({ ...NEW_AIRPORT, icao: "LSZX" });
    expect(dupIata.status).toBe(409);
    expect(dupIata.body.error.fieldErrors).toHaveProperty("iata");
  });

  it("refuses to delete an airport that providers reference", async () => {
    await seedAirports();
    const provider = await providerAt(["EGLL"]);
    const { agent } = await signedInAgent("ADMIN", app);
    const r = await agent.delete(adm("/EGLL"));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("AIRPORT_IN_USE");
    await provider.deleteOne();
    expect((await agent.delete(adm("/EGLL"))).status).toBe(204);
  });

  it("propagates an IATA change to providers' airport codes", async () => {
    await seedAirports();
    const provider = await providerAt(["EGLL"]);
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.patch(adm("/EGLL")).send({ iata: "LHX" })).status).toBe(200);
    const after = await Provider.findById(provider._id);
    expect([...after!.airportCodes].sort()).toEqual(["EGLL", "LHX"]);
  });
});
