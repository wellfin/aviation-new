import request from "supertest";
import { describe, expect, it } from "vitest";
import { Faq } from "../src/modules/faqs/faq.model.js";
import { adminFaqsRouter, faqsRouter } from "../src/modules/faqs/faqs.routes.js";
import { seedContent } from "../src/modules/news/content.seed.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/faqs", faqsRouter], ["/admin/faqs", adminFaqsRouter]);
const admin = (p = "") => `/api/v1/admin/faqs${p}`;
const faq = <T extends object = object>(over?: T) => ({ question: "How do I list my business?", answer: "Register as a provider.", category: "Service Providers" as const, ...over });

describe("faqs — public", () => {
  it("returns an empty list when there are none", async () => {
    const r = await request(app).get("/api/v1/faqs");
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([]);
  });

  it("lists published FAQs in order as FaqItem[] and filters by category", async () => {
    await seedContent();
    await Faq.create({ ...faq({ question: "Hidden question?" }), published: false, order: 0 });
    const r = await request(app).get("/api/v1/faqs");
    expect(r.body.data).toHaveLength(15);
    expect(r.body.data[0]).toEqual({ id: expect.any(String), category: "Aviation Directory", question: "What is the Global Aviation Services Directory?", answer: expect.any(String) });
    expect(r.body.data.map((f: { question: string }) => f.question)).not.toContain("Hidden question?");

    const cat = await request(app).get(`/api/v1/faqs?category=${encodeURIComponent("Membership")}`);
    expect(cat.body.data).toHaveLength(2);
    expect(cat.body.data.every((f: { category: string }) => f.category === "Membership")).toBe(true);

    // Unknown categories (raw URL params from the site) just match nothing.
    const unknown = await request(app).get("/api/v1/faqs?category=Nope");
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual([]);
  });
});

describe("faqs — admin", () => {
  it("requires auth and content:manage", async () => {
    expect((await request(app).get(admin())).status).toBe(401);
    const { agent } = await signedInAgent("PROVIDER", app);
    expect((await agent.post(admin()).send(faq())).status).toBe(401);
  });

  it("creates at the end of the list, updates, deletes and validates", async () => {
    const { agent } = await signedInAgent("MANAGER", app);
    const a = await agent.post(admin()).send(faq());
    const b = await agent.post(admin()).send(faq({ question: "Second question?" }));
    expect(a.status).toBe(201);
    expect(a.body.data.order).toBe(0);
    expect(b.body.data.order).toBe(1);

    const bad = await agent.post(admin()).send(faq({ category: "Other", question: "" }));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["category", "question"]));

    const upd = await agent.patch(admin(`/${a.body.data.id}`)).send({ published: false });
    expect(upd.body.data.published).toBe(false);
    expect((await request(app).get("/api/v1/faqs")).body.data).toHaveLength(1);
    expect((await agent.get(admin("?published=false"))).body.data).toHaveLength(1);

    expect((await agent.delete(admin(`/${a.body.data.id}`))).status).toBe(204);
    expect((await agent.get(admin(`/${a.body.data.id}`))).status).toBe(404);
    expect((await agent.patch(admin("/xyz")).send({ published: true })).status).toBe(422);
  });

  it("reorders in bulk", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const ids: string[] = [];
    for (const q of ["First question?", "Second question?", "Third question?"]) ids.push((await agent.post(admin()).send(faq({ question: q }))).body.data.id);
    const reversed = [...ids].reverse();
    const r = await agent.put(admin("/order")).send({ ids: reversed });
    expect(r.status).toBe(200);
    expect(r.body.data.map((f: { id: string }) => f.id)).toEqual(reversed);
    expect((await request(app).get("/api/v1/faqs")).body.data.map((f: { id: string }) => f.id)).toEqual(reversed);
  });

  it("rolls back the whole reorder when an id is unknown", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const ids: string[] = [];
    for (const q of ["First question?", "Second question?"]) ids.push((await agent.post(admin()).send(faq({ question: q }))).body.data.id);
    const r = await agent.put(admin("/order")).send({ ids: [ids[1], "64b7f0000000000000000000", ids[0]] });
    expect(r.status).toBe(400);
    const orders = (await Faq.find().sort({ order: 1 }).lean()).map((f) => f._id.toString());
    expect(orders).toEqual(ids);

    expect((await agent.put(admin("/order")).send({ ids: [ids[0], ids[0]] })).status).toBe(422);
    expect((await agent.put(admin("/order")).send({ ids: ["bad"] })).status).toBe(422);
  });
});
