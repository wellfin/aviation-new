import request from "supertest";
import { describe, expect, it } from "vitest";
import { seedContent } from "../src/modules/news/content.seed.js";
import { News } from "../src/modules/news/news.model.js";
import { adminNewsRouter, newsRouter } from "../src/modules/news/news.routes.js";
import { slugify } from "../src/modules/news/news.service.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/news", newsRouter], ["/admin/news", adminNewsRouter]);
const admin = (p = "") => `/api/v1/admin/news${p}`;

const article = <T extends object = object>(over?: T) => ({
  title: "Fuel Price Trends — Élan Q3",
  excerpt: "Avgas and Jet A1 updates across major hubs.",
  category: "Fuel" as const,
  image: "/images/news/fuel-trends.png",
  body: ["word ".repeat(450).trim(), "Second paragraph."],
  author: "Mark Ellison",
  authorRole: "Fuel Markets Analyst",
  ...over,
});

describe("news — public", () => {
  it("returns an empty page when there are no articles", async () => {
    const r = await request(app).get("/api/v1/news");
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ items: [], total: 0, page: 1, pageSize: 9, totalPages: 1 });
  });

  it("lists only published articles, newest first, in the NewsArticle shape", async () => {
    await seedContent();
    await News.create({ ...article({ title: "Secret draft" }), slug: "secret-draft", status: "draft" });
    await News.create({ ...article({ title: "Future" }), slug: "future", status: "published", publishedAt: new Date(Date.now() + 86_400_000) });

    const r = await request(app).get("/api/v1/news?pageSize=50");
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(9);
    const items = r.body.data.items as Array<{ slug: string; publishedAt: string }>;
    expect(items.map((i) => i.slug)).not.toContain("secret-draft");
    expect(items.map((i) => i.slug)).not.toContain("future");
    expect([...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).toEqual(items);
    expect(Object.keys(items[0]!).sort()).toEqual(
      ["author", "authorRole", "body", "category", "excerpt", "featured", "image", "publishedAt", "readMinutes", "slug", "title"].sort(),
    );
  });

  it("filters by category and search term, paginates, and treats 'all' as no filter", async () => {
    await seedContent();
    const byCat = await request(app).get("/api/v1/news?category=Regulatory");
    expect(byCat.body.data.items.every((n: { category: string }) => n.category === "Regulatory")).toBe(true);
    expect(byCat.body.data.total).toBe(2);

    const search = await request(app).get("/api/v1/news?q=changi&category=all");
    expect(search.body.data.items).toHaveLength(1);
    expect((await request(app).get("/api/v1/news?q=(.*")).status).toBe(200);

    const page2 = await request(app).get("/api/v1/news?page=2&pageSize=4");
    expect(page2.body.data).toMatchObject({ page: 2, pageSize: 4, total: 9, totalPages: 3 });
    expect(page2.body.data.items).toHaveLength(4);
  });

  it("validates query params", async () => {
    const r = await request(app).get("/api/v1/news?category=Gossip&pageSize=1000");
    expect(r.status).toBe(422);
    expect(r.body.error.fieldErrors).toHaveProperty("category");
    expect(r.body.error.fieldErrors).toHaveProperty("pageSize");
  });

  it("gets one published article by slug, 404s drafts and unknown slugs", async () => {
    await seedContent();
    const r = await request(app).get("/api/v1/news/digital-notams-rollout");
    expect(r.status).toBe(200);
    expect(r.body.data.title).toBe("Digital NOTAM Rollout Enters Final Phase");
    await News.create({ ...article(), slug: "draft-one", status: "draft" });
    expect((await request(app).get("/api/v1/news/draft-one")).status).toBe(404);
    expect((await request(app).get("/api/v1/news/nope")).status).toBe(404);
    expect((await request(app).get("/api/v1/news/Bad%20Slug!")).status).toBe(422);
  });
});

describe("news — admin", () => {
  it("requires auth and content:manage", async () => {
    expect((await request(app).get(admin())).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(admin())).status).toBe(401);
      expect((await agent.post(admin()).send(article())).status).toBe(401);
    }
    const { agent } = await signedInAgent("MANAGER", app);
    expect((await agent.get(admin())).status).toBe(200);
  });

  it("creates drafts with a generated unique slug and computed read time", async () => {
    const { agent } = await signedInAgent("MANAGER", app);
    const a = await agent.post(admin()).send(article());
    expect(a.status).toBe(201);
    expect(a.body.data).toMatchObject({ slug: "fuel-price-trends-elan-q3", status: "draft", publishedAt: null, readMinutes: 3 });
    const b = await agent.post(admin()).send(article());
    expect(b.body.data.slug).toBe("fuel-price-trends-elan-q3-2");
    // drafts are invisible publicly
    expect((await request(app).get(`/api/v1/news/${a.body.data.slug}`)).status).toBe(404);
  });

  it("rejects an explicit duplicate slug with 409 and invalid bodies with 422", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.post(admin()).send(article({ slug: "taken" }))).status).toBe(201);
    const dup = await agent.post(admin()).send(article({ slug: "taken" }));
    expect(dup.status).toBe(409);
    expect(dup.body.error.fieldErrors).toHaveProperty("slug");

    const bad = await agent.post(admin()).send(article({ category: "Gossip", image: "javascript:alert(1)", body: [], slug: "Bad Slug" }));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["category", "image", "body", "slug"]));
  });

  it("publishes, unpublishes, updates and deletes", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const { body } = await agent.post(admin()).send(article());
    const id = body.data.id as string;

    const pub = await agent.post(admin(`/${id}/publish`));
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe("published");
    const firstPublishedAt = pub.body.data.publishedAt as string;
    expect((await request(app).get(`/api/v1/news/${body.data.slug}`)).status).toBe(200);

    expect((await agent.post(admin(`/${id}/unpublish`))).body.data.status).toBe("draft");
    expect((await request(app).get(`/api/v1/news/${body.data.slug}`)).status).toBe(404);
    const again = await agent.post(admin(`/${id}/publish`));
    expect(again.body.data.publishedAt).toBe(firstPublishedAt);

    const upd = await agent.patch(admin(`/${id}`)).send({ title: "New title", body: ["short"] });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ title: "New title", readMinutes: 1, slug: body.data.slug });
    expect((await agent.patch(admin(`/${id}`)).send({})).status).toBe(422);

    const list = await agent.get(admin("?status=published&q=new"));
    expect(list.body.data.total).toBe(1);

    expect((await agent.delete(admin(`/${id}`))).status).toBe(204);
    expect((await agent.get(admin(`/${id}`))).status).toBe(404);
    expect((await agent.delete(admin(`/${id}`))).status).toBe(404);
    expect((await agent.get(admin("/not-an-id"))).status).toBe(422);
  });

  it("returns 409 when renaming a slug onto an existing one", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    await agent.post(admin()).send(article({ slug: "one" }));
    const two = await agent.post(admin()).send(article({ slug: "two" }));
    expect((await agent.patch(admin(`/${two.body.data.id}`)).send({ slug: "one" })).status).toBe(409);
  });
});

describe("slugify", () => {
  it("folds accents and punctuation", () => {
    expect(slugify("  Heathrow: GA Slots — Winter 2026!  ")).toBe("heathrow-ga-slots-winter-2026");
    expect(slugify("¿¡!!")).toBe("article");
  });
});

describe("seedContent", () => {
  it("is idempotent and never overwrites admin edits", async () => {
    const first = await seedContent();
    expect(first).toEqual({ news: 9, faqs: 15, ads: 4, pricingPlans: 3 });
    await News.updateOne({ slug: "digital-notams-rollout" }, { $set: { title: "Edited" } });
    const second = await seedContent();
    expect(second).toEqual({ news: 0, faqs: 0, ads: 0, pricingPlans: 0 });
    expect((await News.findOne({ slug: "digital-notams-rollout" }))?.title).toBe("Edited");
  });
});
