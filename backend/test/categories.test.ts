import request from "supertest";
import { describe, expect, it } from "vitest";
import { Provider } from "../src/modules/providers/provider.model.js";
import { app, signedInAgent } from "./helpers.js";

const api = (p: string) => `/api/v1${p}`;

async function publishedProvider(category: string) {
  return Provider.create({
    slug: `p-${category}-${Date.now()}`,
    name: "Test Provider",
    status: "published",
    category,
    countryCode: "GB",
    country: "United Kingdom",
    city: "London",
    summary: "Test",
  });
}

describe("service categories", () => {
  it("lists active categories publicly in display order", async () => {
    const r = await request(app).get(api("/categories"));
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(14);
    expect(r.body.data[0]).toMatchObject({ slug: "fbo", name: "FBO", longName: "Fixed Base Operator", active: true, providerCount: 0 });
  });

  it("counts only published providers per category", async () => {
    await publishedProvider("fuel");
    await Provider.create({ slug: "draft-fuel", name: "Draft", status: "draft", category: "fuel", countryCode: "GB", country: "United Kingdom", city: "London", summary: "Draft" });
    const r = await request(app).get(api("/categories"));
    expect(r.body.data.find((c: { slug: string }) => c.slug === "fuel").providerCount).toBe(1);
  });

  it("is managed only by staff with providers:manage", async () => {
    expect((await request(app).get(api("/admin/categories"))).status).toBe(401);
    const { agent } = await signedInAgent("PROVIDER");
    expect((await agent.post(api("/admin/categories")).send({ slug: "helipads", name: "Helipads", longName: "Helipad Operators" })).status).toBe(401);
  });

  it("creates, updates, reorders and deletes categories", async () => {
    const { agent } = await signedInAgent("MANAGER");
    const c = await agent.post(api("/admin/categories")).send({ slug: "helipads", name: "Helipads", longName: "Helipad Operators", emoji: "🚁", icon: "plane" });
    expect(c.status).toBe(201);
    expect(c.body.data.order).toBeGreaterThan(100);
    expect((await agent.post(api("/admin/categories")).send({ slug: "helipads", name: "Dup", longName: "Dup" })).status).toBe(409);
    expect((await agent.post(api("/admin/categories")).send({ slug: "Bad Slug!", name: "X", longName: "X" })).status).toBe(422);

    const u = await agent.patch(api("/admin/categories/helipads")).send({ name: "Helipad Services", showInMenu: false });
    expect(u.body.data).toMatchObject({ name: "Helipad Services", showInMenu: false });

    const all = (await agent.get(api("/admin/categories"))).body.data.map((x: { slug: string }) => x.slug) as string[];
    const reordered = ["helipads", ...all.filter((s) => s !== "helipads")];
    const o = await agent.put(api("/admin/categories/order")).send({ slugs: reordered });
    expect(o.status).toBe(200);
    expect(o.body.data[0].slug).toBe("helipads");
    expect((await agent.put(api("/admin/categories/order")).send({ slugs: ["helipads", "nope"] })).status).toBe(400);

    expect((await agent.delete(api("/admin/categories/helipads"))).status).toBe(204);
    expect((await agent.delete(api("/admin/categories/helipads"))).status).toBe(404);
  });

  it("refuses to delete or deactivate a category that listings use, and reports usage", async () => {
    const { agent } = await signedInAgent("ADMIN");
    await publishedProvider("fuel");
    expect((await agent.delete(api("/admin/categories/fuel"))).body.error.code).toBe("CATEGORY_IN_USE");
    expect((await agent.patch(api("/admin/categories/fuel")).send({ active: false })).status).toBe(409);
    const list = await agent.get(api("/admin/categories"));
    expect(list.body.data.find((x: { slug: string }) => x.slug === "fuel").providerCount).toBe(1);
  });

  it("deactivated categories disappear publicly and are rejected for new listings", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    expect((await admin.patch(api("/admin/categories/permit")).send({ active: false })).status).toBe(200);
    const pub = await request(app).get(api("/categories"));
    expect(pub.body.data.some((x: { slug: string }) => x.slug === "permit")).toBe(false);

    const { agent: provider } = await signedInAgent("PROVIDER");
    const r = await provider.post(api("/me/listing")).send({ name: "Permit Co", category: "permit", countryCode: "GB", country: "United Kingdom", city: "London", summary: "Overflight permits worldwide." });
    expect(r.status).toBe(422);
    expect(r.body.error.fieldErrors.category).toBeDefined();
  });
});
