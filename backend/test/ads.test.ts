import request from "supertest";
import { describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { Ad, isSafeAdHref } from "../src/modules/ads/ad.model.js";
import { adminAdsRouter, adsRouter } from "../src/modules/ads/ads.routes.js";
import { pickWeighted } from "../src/modules/ads/ads.service.js";
import { seedContent } from "../src/modules/news/content.seed.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/ads", adsRouter], ["/admin/ads", adminAdsRouter]);
const admin = (p = "") => `/api/v1/admin/ads${p}`;
const ad = <T extends object = object>(over?: T) => ({
  placement: "sidebar" as const,
  advertiser: "Universal Weather",
  headline: "End-to-End Trip Support",
  image: "/images/shared/ad.jpg",
  href: "https://example.com/landing",
  ...over,
});

describe("ads — serving", () => {
  it("returns null data when nothing is eligible", async () => {
    const r = await request(app).get("/api/v1/ads/serve?placement=inline");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ data: null });
  });

  it("serves an active in-window ad in the Advertisement shape and counts the impression", async () => {
    await seedContent();
    const r = await request(app).get("/api/v1/ads/serve?placement=sticky-footer");
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({
      id: expect.any(String),
      placement: "sticky-footer",
      advertiser: "American Flight Support",
      image: "/images/shared/sticky-ad-american-flight-support.png",
      href: "https://americanflightsupport.com",
      clickUrl: `${env.PUBLIC_API_URL}/api/v1/ads/${r.body.data.id}/click`,
    });
    expect((await Ad.findById(r.body.data.id))?.impressions).toBe(1);
  });

  it("skips inactive, not-yet-started and expired ads", async () => {
    const now = Date.now();
    await Ad.create([
      { ...ad({ advertiser: "Off" }), active: false },
      { ...ad({ advertiser: "Future" }), startsAt: new Date(now + 3_600_000) },
      { ...ad({ advertiser: "Past" }), endsAt: new Date(now - 1000) },
    ]);
    expect((await request(app).get("/api/v1/ads/serve?placement=sidebar")).body.data).toBeNull();
    await Ad.create({ ...ad({ advertiser: "Live" }), startsAt: new Date(now - 1000), endsAt: new Date(now + 3_600_000) });
    expect((await request(app).get("/api/v1/ads/serve?placement=sidebar")).body.data.advertiser).toBe("Live");
  });

  it("rotates between every eligible ad in a slot and counts each view", async () => {
    // e.g. one provider booked 5 sidebar ads through the admin console.
    const names = ["Ad 1", "Ad 2", "Ad 3", "Ad 4", "Ad 5"];
    await Ad.create(names.map((advertiser) => ad({ advertiser })));
    const seen = new Map<string, number>();
    const VIEWS = 200;
    for (let i = 0; i < VIEWS; i++) {
      const name = (await request(app).get("/api/v1/ads/serve?placement=sidebar")).body.data.advertiser as string;
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual(names);
    // Equal weights → roughly 40 views each (the chance of any ad getting < 10 is negligible).
    for (const n of seen.values()) expect(n).toBeGreaterThan(10);
    const total = (await Ad.find({ placement: "sidebar" })).reduce((s, a) => s + a.impressions, 0);
    expect(total).toBe(VIEWS);
  });

  it("validates the placement", async () => {
    expect((await request(app).get("/api/v1/ads/serve?placement=popup")).status).toBe(422);
    expect((await request(app).get("/api/v1/ads/serve")).status).toBe(422);
  });

  it("picks proportionally to weight", () => {
    const items = [{ weight: 1 }, { weight: 3 }];
    expect(pickWeighted(items, () => 0)).toBe(items[0]);
    expect(pickWeighted(items, () => 1)).toBe(items[1]);
    expect(pickWeighted(items, () => 3)).toBe(items[1]);
    expect(pickWeighted([])).toBeNull();
  });
});

describe("ads — click tracking", () => {
  it("counts the click and redirects only to the stored href", async () => {
    const ext = await Ad.create(ad());
    const r = await request(app).get(`/api/v1/ads/${ext.id}/click`);
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("https://example.com/landing");
    expect((await Ad.findById(ext.id))?.clicks).toBe(1);

    const rel = await Ad.create(ad({ href: "/directory" }));
    const r2 = await request(app).get(`/api/v1/ads/${rel.id}/click?to=https://evil.example`);
    expect(r2.headers.location).toBe(`${env.FRONTEND_URL}/directory`);
  });

  it("validates the id and 404s unknown ads", async () => {
    expect((await request(app).get("/api/v1/ads/not-an-id/click")).status).toBe(422);
    expect((await request(app).get("/api/v1/ads/64b7f0000000000000000000/click")).status).toBe(404);
  });

  it("only allows http(s) or site-relative links", () => {
    for (const ok of ["https://a.com/x?y=1", "http://a.com", "/providers/x"]) expect(isSafeAdHref(ok)).toBe(true);
    for (const bad of ["javascript:alert(1)", "//evil.com", "/\\evil.com", "data:text/html,x", "ftp://a.com", "https:/evil", "relative/path", "/a b"]) {
      expect(isSafeAdHref(bad)).toBe(false);
    }
  });
});

describe("ads — admin", () => {
  it("requires ads:manage (admins only)", async () => {
    expect((await request(app).get(admin())).status).toBe(401);
    const { agent } = await signedInAgent("MANAGER", app);
    expect((await agent.get(admin())).status).toBe(403);
  });

  it("creates, lists with stats, updates and deletes", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const c = await agent.post(admin()).send(ad({ weight: 80 }));
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ weight: 80, active: true, impressions: 0, clicks: 0, ctr: 0, startsAt: null });
    const id = c.body.data.id as string;

    await Ad.updateOne({ _id: id }, { $set: { impressions: 200, clicks: 5 } });
    const list = await agent.get(admin("?placement=sidebar"));
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0].ctr).toBe(2.5);

    const stats = await agent.get(admin("/stats"));
    expect(stats.body.data).toHaveLength(5);
    expect(stats.body.data.find((s: { placement: string }) => s.placement === "sidebar")).toMatchObject({ ads: 1, activeAds: 1, impressions: 200, clicks: 5, ctr: 2.5 });

    const upd = await agent.patch(admin(`/${id}`)).send({ active: false, cta: null });
    expect(upd.body.data).toMatchObject({ active: false, cta: null });
    expect((await request(app).get("/api/v1/ads/serve?placement=sidebar")).body.data).toBeNull();

    expect((await agent.delete(admin(`/${id}`))).status).toBe(204);
    expect((await agent.get(admin(`/${id}`))).status).toBe(404);
  });

  it("rejects unsafe links, bad weights and inverted schedules", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const bad = await agent.post(admin()).send(ad({ href: "javascript:alert(1)", weight: 0, placement: "popup" }));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["href", "weight", "placement"]));
    const window = await agent.post(admin()).send(ad({ startsAt: "2026-10-02T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" }));
    expect(window.status).toBe(422);
    expect(window.body.error.fieldErrors).toHaveProperty("endsAt");

    const ok = await agent.post(admin()).send(ad({ endsAt: "2026-10-01T00:00:00Z" }));
    const partial = await agent.patch(admin(`/${ok.body.data.id}`)).send({ startsAt: "2026-12-01T00:00:00Z" });
    expect(partial.status).toBe(400);
  });
});
