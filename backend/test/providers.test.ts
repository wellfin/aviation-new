import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { Airport } from "../src/modules/airports/airport.model.js";
import { seedAirports } from "../src/modules/airports/airports.seed.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import { adminProvidersRouter, myListingRouter, providersRouter } from "../src/modules/providers/providers.routes.js";
import { seedProviders } from "../src/modules/providers/providers.seed.js";
import { slugify } from "../src/modules/providers/providers.service.js";
import { Review } from "../src/modules/reviews/review.model.js";
import { User } from "../src/modules/users/user.model.js";
import { appWith, createUser, signedInAgent } from "./helpers.js";

const app = appWith(["/providers", providersRouter], ["/me/listing", myListingRouter], ["/admin/providers", adminProvidersRouter]);
const pub = (p: string) => `/api/v1/providers${p}`;
const mine = (p = "") => `/api/v1/me/listing${p}`;
const adm = (p: string) => `/api/v1/admin/providers${p}`;

const TIER_WEIGHT: Record<string, number> = { ultra_pro: 3, pro: 2, basic: 1 };
type Item = { slug: string; tier: string; rating: number; reviewCount: number; name: string; countryCode: string; category: string };

const LISTING = {
  name: "Skyway Handling",
  category: "ground-handler" as const,
  countryCode: "gb",
  country: "United Kingdom",
  city: "London",
  summary: "Independent ground handling at London's business aviation airports.",
};

const COMPLETE = {
  about: ["We handle business jets 24/7."],
  contact: { email: "ops@skyway.example", phone: "+44 20 1234 5678" },
  airports: ["EGLL", "egkk"],
  services: [{ name: "Ground Handling", icon: "plane" }],
};

async function seedAll() {
  await seedAirports();
  await seedProviders();
}

async function providerAgent() {
  return signedInAgent("PROVIDER", app);
}

describe("public provider directory", () => {
  beforeEach(seedAll);

  it("lists published providers only, paid tiers first then by rating", async () => {
    await Provider.updateOne({ slug: "jet-aviation" }, { status: "suspended" });
    const r = await request(app).get(pub("?pageSize=100"));
    expect(r.status).toBe(200);
    const items: Item[] = r.body.data.items;
    expect(r.body.data.total).toBe(23);
    expect(items.map((p) => p.slug)).not.toContain("jet-aviation");
    for (let i = 1; i < items.length; i += 1) {
      const [a, b] = [items[i - 1]!, items[i]!];
      const tierDiff = TIER_WEIGHT[a.tier]! - TIER_WEIGHT[b.tier]!;
      expect(tierDiff).toBeGreaterThanOrEqual(0);
      if (tierDiff === 0) expect(a.rating).toBeGreaterThanOrEqual(b.rating);
    }
    expect(r.body.data.items[0]).toMatchObject({ slug: expect.any(String), airports: expect.any(Array), reviews: [] });
    expect(r.body.data.items[0].airports[0]).toEqual({ icao: expect.any(String), iata: expect.any(String), name: expect.any(String), city: expect.any(String), countryCode: expect.any(String) });
  });

  it("uses a default page size of 9 and paginates", async () => {
    const r = await request(app).get(pub(""));
    expect(r.body.data).toMatchObject({ page: 1, pageSize: 9, total: 24, totalPages: 3 });
    const p3 = await request(app).get(pub("?page=3"));
    expect(p3.body.data.items).toHaveLength(6);
  });

  it("supports every sort within tier bands", async () => {
    const byReviews: Item[] = (await request(app).get(pub("?sort=reviews&tier=pro&pageSize=100"))).body.data.items;
    expect(byReviews.map((p) => p.reviewCount)).toEqual([...byReviews.map((p) => p.reviewCount)].sort((a, b) => b - a));
    const byName: Item[] = (await request(app).get(pub("?sort=name&tier=basic&pageSize=100"))).body.data.items;
    expect(byName.map((p) => p.name)).toEqual([...byName.map((p) => p.name)].sort((a, b) => a.localeCompare(b)));
    const newest: Item[] = (await request(app).get(pub("?sort=newest&tier=ultra_pro&pageSize=100"))).body.data.items;
    expect(newest[0]!.slug).toBe("british-charter-group");
    expect((await request(app).get(pub("?sort=random"))).status).toBe(422);
  });

  it("filters by category, tier, country and airport (ICAO or IATA)", async () => {
    const fbo: Item[] = (await request(app).get(pub("?category=fbo&pageSize=100"))).body.data.items;
    expect(fbo.length).toBe(4);
    expect(fbo.every((p) => p.category === "fbo")).toBe(true);
    const ch: Item[] = (await request(app).get(pub("?country=ch&pageSize=100"))).body.data.items;
    expect(ch.every((p) => p.countryCode === "CH")).toBe(true);
    const byIcao = (await request(app).get(pub("?airport=egkk&pageSize=100"))).body.data.total;
    const byIata = (await request(app).get(pub("?airport=LGW&pageSize=100"))).body.data.total;
    expect(byIcao).toBe(4);
    expect(byIata).toBe(byIcao);
    // Categories are admin-managed data: an unknown slug is a valid filter that matches nothing.
    const unknownCategory = await request(app).get(pub("?category=bakery"));
    expect(unknownCategory.status).toBe(200);
    expect(unknownCategory.body.data.items).toEqual([]);
    expect((await request(app).get(pub("?category=Not A Slug"))).status).toBe(422);
    expect((await request(app).get(pub("?category=all&tier=all"))).body.data.total).toBe(24);
  });

  it("matches every word of q across name, summary, location and airports", async () => {
    const one: Item[] = (await request(app).get(pub("?q=signature"))).body.data.items;
    expect(one.map((p) => p.slug)).toEqual(["signature-aviation"]);
    const multi: Item[] = (await request(app).get(pub("?q=dubai%20fbo&pageSize=100"))).body.data.items;
    expect(multi.map((p) => p.slug)).toEqual(expect.arrayContaining(["execujet", "jet-aviation", "signature-aviation"]));
    // Airport name ("Teterboro") resolves through the airports collection.
    const viaAirport: Item[] = (await request(app).get(pub("?q=teterboro&pageSize=100"))).body.data.items;
    expect(viaAirport.map((p) => p.slug).sort()).toEqual(["jet-aviation", "signature-aviation"]);
    expect((await request(app).get(pub("?q=(.*"))).body.data.total).toBe(0);
    expect((await request(app).get(pub("?q=nonexistentthing"))).body.data).toMatchObject({ items: [], total: 0 });
  });

  it("returns a profile with its latest approved reviews only", async () => {
    const provider = (await Provider.findOne({ slug: "execujet" }))!;
    const users = await Promise.all([createUser(), createUser()]);
    await Review.create([
      { provider: provider._id, author: users[0]!._id, authorName: "Capt. A", authorRole: "Chief Pilot", rating: 5, title: "Great", body: "Great service", status: "approved" },
      { provider: provider._id, author: users[1]!._id, authorName: "Hidden", rating: 1, title: "Pending", body: "Not visible", status: "pending" },
    ]);
    const r = await request(app).get(pub("/execujet"));
    expect(r.status).toBe(200);
    expect(r.body.data.reviews).toEqual([
      { id: expect.any(String), author: "Capt. A", role: "Chief Pilot", rating: 5, date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), title: "Great", body: "Great service" },
    ]);
    expect(r.body.data.airports.map((a: { icao: string }) => a.icao)).toEqual(["OMDB", "OMDW", "WSSS", "EGGW"]);
    expect(r.body.data).not.toHaveProperty("status");
    expect(r.body.data).not.toHaveProperty("owner");
  });

  it("404s unknown and unpublished profiles, 422s malformed slugs", async () => {
    await Provider.updateOne({ slug: "execujet" }, { status: "draft" });
    expect((await request(app).get(pub("/execujet"))).status).toBe(404);
    expect((await request(app).get(pub("/nope"))).status).toBe(404);
    expect((await request(app).get(pub("/Bad_Slug!"))).status).toBe(422);
  });

  it("returns related providers (same category or country, excluding itself)", async () => {
    const r = await request(app).get(pub("/execujet/related?limit=5"));
    expect(r.status).toBe(200);
    const items: Item[] = r.body.data;
    expect(items).toHaveLength(5);
    expect(items.map((p) => p.slug)).not.toContain("execujet");
    expect(items.every((p) => p.category === "fbo" || p.countryCode === "AE")).toBe(true);
    expect((await request(app).get(pub("/execujet/related?limit=99"))).status).toBe(422);
    expect((await request(app).get(pub("/nope/related"))).status).toBe(404);
  });

  it("seeding recomputes airport service counts from published listings", async () => {
    const egkk = await Airport.findOne({ icao: "EGKK" });
    expect(egkk!.servicesCount).toBe(4);
  });
});

describe("my listing (provider owner)", () => {
  beforeEach(async () => {
    await seedAirports();
  });

  it("requires a signed-in provider with a verified email", async () => {
    expect((await request(app).get(mine())).status).toBe(401);
    const { agent: userAgent } = await signedInAgent("USER", app);
    expect((await userAgent.get(mine())).status).toBe(403);

    // Sign-in requires a verified email, so un-verify an active session (the user is re-read per request).
    const { agent, user } = await providerAgent();
    await User.updateOne({ _id: user._id }, { $unset: { emailVerifiedAt: 1 } });
    const r = await agent.post(mine()).send(LISTING);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("creates one draft listing per owner with a unique slug", async () => {
    const { agent, user } = await providerAgent();
    expect((await agent.get(mine())).status).toBe(404);
    await Provider.create({ ...LISTING, slug: "skyway-handling", countryCode: "GB", status: "published" });

    const r = await agent.post(mine()).send({ ...LISTING, ...COMPLETE, tier: "ultra_pro", status: "published", verified: true, rating: 5 });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ slug: "skyway-handling-2", status: "draft", tier: "basic", verified: false, rating: 0, countryCode: "GB" });
    expect(r.body.data.airports.map((a: { icao: string }) => a.icao)).toEqual(["EGLL", "EGKK"]);
    expect(r.body.data.limits).toEqual({ galleryImages: 4, video: false, socials: false });
    const doc = await Provider.findOne({ owner: user._id });
    expect([...doc!.airportCodes]).toEqual(["EGLL", "LHR", "EGKK", "LGW"]);

    const again = await agent.post(mine()).send({ ...LISTING, name: "Second" });
    expect(again.status).toBe(409);
    expect(await Provider.countDocuments({ owner: user._id })).toBe(1);
    expect((await agent.get(mine())).body.data.slug).toBe("skyway-handling-2");
  });

  it("handles concurrent creates without producing two listings", async () => {
    const { agent, user } = await providerAgent();
    const results = await Promise.all([agent.post(mine()).send(LISTING), agent.post(mine()).send(LISTING)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Provider.countDocuments({ owner: user._id })).toBe(1);
  });

  it("validates create and update bodies", async () => {
    const { agent } = await providerAgent();
    const bad = await agent.post(mine()).send({ name: "X", category: "bakery", countryCode: "GBR", contact: { email: "nope" } });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["name", "countryCode", "country", "city", "summary", "contact.email"]));
    // A well-formed but unknown/inactive category is rejected against the live catalogue.
    const unknownCategory = await agent.post(mine()).send({ ...LISTING, category: "bakery" });
    expect(unknownCategory.status).toBe(422);
    expect(unknownCategory.body.error.fieldErrors.category).toBeDefined();
    const unknownAirport = await agent.post(mine()).send({ ...LISTING, airports: ["ZZZZ", "EGLL"] });
    expect(unknownAirport.status).toBe(422);
    expect(unknownAirport.body.error.fieldErrors.airports).toMatch(/ZZZZ/);
    await agent.post(mine()).send(LISTING);
    expect((await agent.patch(mine()).send({})).status).toBe(422);
    expect((await agent.patch(mine()).send({ coverImage: "javascript:alert(1)" })).status).toBe(422);
    expect((await agent.patch(mine()).send({ gallery: Array(31).fill("/images/a.jpg") })).status).toBe(422);
  });

  it("edits whitelisted fields only and merges nested contact fields", async () => {
    const { agent } = await providerAgent();
    await agent.post(mine()).send({ ...LISTING, contact: { email: "a@b.co", phone: "+1 555" } });
    const r = await agent.patch(mine()).send({ city: "Luton", contact: { phone: "+44 1" }, tier: "ultra_pro", verified: true, status: "published", fleet: [{ model: "Phenom 300", category: "Light Jet", seats: 7, rangeNm: 2000, speedKts: 450, baseIcao: "egkk" }] });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ city: "Luton", tier: "basic", verified: false, status: "draft" });
    expect(r.body.data.contact).toMatchObject({ email: "a@b.co", phone: "+44 1" });
    expect(r.body.data.fleet[0]).toMatchObject({ model: "Phenom 300", baseIcao: "EGKK", id: expect.stringMatching(/^[a-f\d]{24}$/) });

    // Existing aircraft ids survive a re-save.
    const id = r.body.data.fleet[0].id;
    const again = await agent.patch(mine()).send({ fleet: [{ ...r.body.data.fleet[0], seats: 8, yearOfManufacture: 2020 }] });
    expect(again.body.data.fleet[0]).toMatchObject({ id, seats: 8 });
  });

  it("enforces tier limits on gallery, video and socials with clear 422s", async () => {
    const { agent, user } = await providerAgent();
    await agent.post(mine()).send(LISTING);
    const basic = await agent.patch(mine()).send({ gallery: Array(5).fill("/images/a.jpg"), videoUrl: "https://youtube.com/embed/x", socials: { linkedin: "https://linkedin.com/c/x" } });
    expect(basic.status).toBe(422);
    expect(Object.keys(basic.body.error.fieldErrors).sort()).toEqual(["gallery", "socials", "videoUrl"]);
    expect(basic.body.error.fieldErrors.gallery).toMatch(/4 gallery images/);
    expect((await agent.patch(mine()).send({ gallery: Array(4).fill("/images/a.jpg"), socials: { linkedin: "" } })).status).toBe(200);

    await Provider.updateOne({ owner: user._id }, { tier: "pro" });
    expect((await agent.patch(mine()).send({ gallery: Array(12).fill("/images/a.jpg"), socials: { x: "https://x.com/sky" } })).status).toBe(200);
    expect((await agent.patch(mine()).send({ gallery: Array(13).fill("/images/a.jpg") })).status).toBe(422);
    expect((await agent.patch(mine()).send({ videoUrl: "https://youtube.com/embed/x" })).status).toBe(422);

    await Provider.updateOne({ owner: user._id }, { tier: "ultra_pro" });
    const ultra = await agent.patch(mine()).send({ gallery: Array(30).fill("/images/a.jpg"), videoUrl: "https://youtube.com/embed/x" });
    expect(ultra.status).toBe(200);
    expect(ultra.body.data.videoUrl).toBe("https://youtube.com/embed/x");
  });

  it("submits for review only with the minimum content and valid status", async () => {
    const { agent } = await providerAgent();
    expect((await agent.post(mine("/submit"))).status).toBe(404);
    await agent.post(mine()).send(LISTING);
    const incomplete = await agent.post(mine("/submit"));
    expect(incomplete.status).toBe(422);
    expect(Object.keys(incomplete.body.error.fieldErrors).sort()).toEqual(["about", "airports", "contact", "services"]);

    await agent.patch(mine()).send(COMPLETE);
    const ok = await agent.post(mine("/submit"));
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("pending");
    const twice = await agent.post(mine("/submit"));
    expect(twice.status).toBe(409);
  });

  it("keeps a published listing published when edited and recounts airports", async () => {
    const { agent, user } = await providerAgent();
    await agent.post(mine()).send({ ...LISTING, ...COMPLETE });
    await Provider.updateOne({ owner: user._id }, { status: "published" });
    const r = await agent.patch(mine()).send({ airports: ["OMDB"], summary: "Now based in Dubai for all business jet ops." });
    expect(r.body.data.status).toBe("published");
    const counts = Object.fromEntries((await Airport.find({ icao: { $in: ["EGLL", "OMDB"] } })).map((a) => [a.icao, a.servicesCount]));
    expect(counts).toEqual({ EGLL: 0, OMDB: 1 });
  });

  it("isolates owners from each other's listings", async () => {
    const a = await providerAgent();
    const b = await providerAgent();
    await a.agent.post(mine()).send(LISTING);
    expect((await b.agent.get(mine())).status).toBe(404);
    expect((await b.agent.patch(mine()).send({ city: "Hijacked" })).status).toBe(404);
    expect((await a.agent.get(mine())).body.data.city).toBe("London");
  });
});

describe("admin providers", () => {
  beforeEach(async () => {
    await seedAirports();
  });

  async function pendingListing() {
    const owner = await signedInAgent("PROVIDER", app);
    await owner.agent.post(mine()).send({ ...LISTING, ...COMPLETE });
    await owner.agent.post(mine("/submit"));
    const doc = (await Provider.findOne({ owner: owner.user._id }))!;
    return { owner, id: doc.id as string };
  }

  it("requires providers:manage", async () => {
    expect((await request(app).get(adm(""))).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(adm(""))).status).toBe(401);
    }
    const { agent } = await signedInAgent("MANAGER", app);
    expect((await agent.get(adm(""))).status).toBe(200);
  });

  it("lists every status with filters, search and owner info", async () => {
    await seedProviders();
    const { owner } = await pendingListing();
    const { agent } = await signedInAgent("ADMIN", app);
    const pending = await agent.get(adm("?status=pending"));
    expect(pending.body.data.total).toBe(1);
    expect(pending.body.data.items[0]).toMatchObject({ status: "pending", owner: { email: owner.user.email } });
    expect((await agent.get(adm("?tier=ultra_pro&pageSize=50"))).body.data.total).toBe(6);
    expect((await agent.get(adm("?q=skyway"))).body.data.total).toBe(1);
    expect((await agent.get(adm("?q=egkk"))).body.data.total).toBe(5);
    expect((await agent.get(adm("?status=gone"))).status).toBe(422);
  });

  it("approves a pending listing, sets publishedAt, recounts airports and emails the owner", async () => {
    const { owner, id } = await pendingListing();
    const { agent } = await signedInAgent("MANAGER", app);
    const r = await agent.post(adm(`/${id}/approve`));
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("published");
    expect(r.body.data.publishedAt).toBeTruthy();
    expect((await Airport.findOne({ icao: "EGLL" }))!.servicesCount).toBe(1);
    await new Promise((res) => setTimeout(res, 20));
    expect(testOutbox.some((m) => m.to === owner.user.email && /is live/.test(m.subject))).toBe(true);
    expect((await request(app).get(pub(`/${r.body.data.slug}`))).status).toBe(200);
    expect((await agent.post(adm(`/${id}/approve`))).status).toBe(409);
  });

  it("rejects with a reason (emailed), and the owner can resubmit", async () => {
    const { owner, id } = await pendingListing();
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.post(adm(`/${id}/reject`)).send({})).status).toBe(422);
    const r = await agent.post(adm(`/${id}/reject`)).send({ reason: "Please add a real phone number." });
    expect(r.body.data).toMatchObject({ status: "rejected", rejectionReason: "Please add a real phone number." });
    await new Promise((res) => setTimeout(res, 20));
    expect(testOutbox.find((m) => m.to === owner.user.email)?.text).toMatch(/real phone number/);
    expect((await owner.agent.get(mine())).body.data.rejectionReason).toMatch(/phone/);
    const resubmit = await owner.agent.post(mine("/submit"));
    expect(resubmit.body.data).toMatchObject({ status: "pending", rejectionReason: null });
  });

  it("validates status transitions (suspend, unpublish)", async () => {
    const { id } = await pendingListing();
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.post(adm(`/${id}/suspend`))).status).toBe(409);
    expect((await agent.post(adm(`/${id}/unpublish`))).status).toBe(409);
    await agent.post(adm(`/${id}/approve`));
    const s = await agent.post(adm(`/${id}/suspend`));
    expect(s.body.data.status).toBe("suspended");
    expect((await Airport.findOne({ icao: "EGLL" }))!.servicesCount).toBe(0);
    expect((await agent.post(adm(`/${id}/reject`)).send({ reason: "Not pending anymore" })).status).toBe(409);
    expect((await agent.post(adm(`/${id}/unpublish`))).body.data.status).toBe("draft");
    expect((await agent.post(adm("/64b7f0000000000000000000/approve"))).status).toBe(404);
    expect((await agent.post(adm("/not-an-id/approve"))).status).toBe(422);
  });

  it("creates curated listings, optionally assigned to a provider account", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const providerUser = await createUser({ role: "PROVIDER" });
    const plainUser = await createUser();
    const r = await agent.post(adm("")).send({ ...LISTING, ...COMPLETE, tier: "pro", verified: true, status: "published", ownerEmail: providerUser.email, gallery: Array(20).fill("/images/x.jpg") });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ tier: "pro", verified: true, status: "published", owner: { email: providerUser.email } });
    expect((await Airport.findOne({ icao: "EGKK" }))!.servicesCount).toBe(1);

    expect((await agent.post(adm("")).send({ ...LISTING, ownerEmail: providerUser.email })).status).toBe(409);
    expect((await agent.post(adm("")).send({ ...LISTING, ownerEmail: plainUser.email })).body.error.fieldErrors).toHaveProperty("ownerEmail");
    expect((await agent.post(adm("")).send({ ...LISTING, ownerEmail: "ghost@example.com" })).status).toBe(422);
    const dupSlug = await agent.post(adm("")).send({ ...LISTING, slug: r.body.data.slug });
    expect(dupSlug.status).toBe(409);
    const autoSlug = await agent.post(adm("")).send(LISTING);
    expect(autoSlug.body.data.slug).toBe("skyway-handling-2");
  });

  it("patches any field including tier, verified, slug and owner", async () => {
    const { id, owner } = await pendingListing();
    const { agent } = await signedInAgent("ADMIN", app);
    const r = await agent.patch(adm(`/${id}`)).send({ tier: "ultra_pro", verified: true, slug: "skyway-premium", city: "Farnborough", ownerEmail: null });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ tier: "ultra_pro", verified: true, slug: "skyway-premium", city: "Farnborough", owner: null, status: "pending" });
    expect((await owner.agent.get(mine())).status).toBe(404);
    expect((await agent.patch(adm(`/${id}`)).send({ tier: "platinum" })).status).toBe(422);
    expect((await agent.patch(adm("/64b7f0000000000000000000")).send({ city: "X" })).status).toBe(404);
  });

  it("deletes a listing with its reviews, enquiries and favourites in one go", async () => {
    const { id } = await pendingListing();
    const { agent } = await signedInAgent("ADMIN", app);
    await agent.post(adm(`/${id}/approve`));
    const fan = await createUser();
    await User.updateOne({ _id: fan._id }, { $push: { favorites: id } });
    await Review.create({ provider: id, author: fan._id, authorName: "Fan", rating: 5, title: "Nice", body: "Nice work", status: "approved" });
    await Enquiry.create({ provider: id, name: "Lead", email: "lead@example.com", message: "Quote please" });

    expect((await agent.delete(adm(`/${id}`))).status).toBe(204);
    expect(await Provider.findById(id)).toBeNull();
    expect(await Review.countDocuments({ provider: id })).toBe(0);
    expect(await Enquiry.countDocuments({ provider: id })).toBe(0);
    expect((await User.findById(fan._id))!.favorites).toHaveLength(0);
    expect((await Airport.findOne({ icao: "EGLL" }))!.servicesCount).toBe(0);
    expect((await agent.delete(adm(`/${id}`))).status).toBe(404);
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("Hunt & Palmer")).toBe("hunt-and-palmer");
    expect(slugify("  Zürich Jet—Services!! ")).toBe("zurich-jet-services");
    expect(slugify("***")).toBe("provider");
  });
});
