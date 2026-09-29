import { describe, expect, it } from "vitest";
import { getAirport, getDistance, getNearbyAirports, searchAirports } from "./airports";
import { getNewsArticle, listFaqs, listNews } from "./content";
import { getProvider, getRelatedProviders, listProviders } from "./providers";

describe("listProviders (mock)", () => {
  it("ranks paid tiers first, then by rating", async () => {
    const { items } = await listProviders({ pageSize: 100 });
    const tierRank = { ultra_pro: 3, pro: 2, basic: 1 } as const;
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];
      expect(tierRank[prev.tier]).toBeGreaterThanOrEqual(tierRank[cur.tier]);
      if (prev.tier === cur.tier) expect(prev.rating).toBeGreaterThanOrEqual(cur.rating);
    }
  });

  it("filters by category and airport", async () => {
    const fuel = await listProviders({ category: "fuel", pageSize: 100 });
    expect(fuel.items.length).toBeGreaterThan(0);
    expect(fuel.items.every((p) => p.category === "fuel")).toBe(true);

    const atLhr = await listProviders({ airport: "lhr", pageSize: 100 });
    expect(atLhr.items.every((p) => p.airports.some((a) => a.icao === "EGLL"))).toBe(true);
  });

  it("matches multi-word search across name, city and airports", async () => {
    const r = await listProviders({ q: "signature heathrow" });
    expect(r.items.map((p) => p.slug)).toContain("signature-aviation");
  });

  it("returns an empty page for no matches", async () => {
    const r = await listProviders({ q: "zzzz-no-such-provider" });
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("paginates", async () => {
    const r = await listProviders({ page: 2, pageSize: 5 });
    expect(r.page).toBe(2);
    expect(r.items.length).toBeLessThanOrEqual(5);
  });
});

describe("providers detail", () => {
  it("returns null for unknown slugs", async () => {
    expect(await getProvider("does-not-exist")).toBeNull();
  });
  it("related providers exclude the provider itself", async () => {
    const p = await getProvider("signature-aviation");
    expect(p).not.toBeNull();
    const related = await getRelatedProviders(p!);
    expect(related.some((r) => r.slug === p!.slug)).toBe(false);
  });
});

describe("airports (mock)", () => {
  it("resolves by ICAO or IATA, case-insensitively", async () => {
    expect((await getAirport("egll"))?.iata).toBe("LHR");
    expect((await getAirport("DXB"))?.icao).toBe("OMDB");
    expect(await getAirport("ZZZZ")).toBeNull();
  });

  it("searchAirports puts the exact code match first without duplicates", async () => {
    const r = await searchAirports("LHR");
    expect(r[0].icao).toBe("EGLL");
    expect(new Set(r.map((a) => a.icao)).size).toBe(r.length);
  });

  it("nearby airports are sorted by distance and within radius", async () => {
    const { origin, results } = await getNearbyAirports("EGLL", 150);
    expect(origin?.icao).toBe("EGLL");
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) expect(results[i].distanceKm).toBeGreaterThanOrEqual(results[i - 1].distanceKm);
    expect(results.every((r) => r.distanceKm <= 150 && r.airport.icao !== "EGLL")).toBe(true);
  });

  it("distance between two airports", async () => {
    const d = await getDistance("KJFK", "KLAX");
    expect(d?.distanceKm).toBeGreaterThan(3950);
    expect(d?.distanceKm).toBeLessThan(4000);
    expect(await getDistance("KJFK", "NOPE")).toBeNull();
  });
});

describe("content (mock)", () => {
  it("news is newest first and filterable", async () => {
    const all = await listNews({ pageSize: 50 });
    for (let i = 1; i < all.items.length; i++) expect(all.items[i - 1].publishedAt >= all.items[i].publishedAt).toBe(true);
    const reg = await listNews({ category: "Regulatory", pageSize: 50 });
    expect(reg.items.every((n) => n.category === "Regulatory")).toBe(true);
  });
  it("unknown article → null", async () => {
    expect(await getNewsArticle("nope")).toBeNull();
  });
  it("faqs filter by category", async () => {
    const f = await listFaqs("Membership");
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => x.category === "Membership")).toBe(true);
  });
});
