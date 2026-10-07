import request from "supertest";
import { describe, expect, it } from "vitest";
import { seedAdFormats } from "../src/modules/ad-formats/ad-format.seed.js";
import { app, signedInAgent } from "./helpers.js";

const api = (p: string) => `/api/v1${p}`;

describe("advertising formats", () => {
  it("lists active formats publicly", async () => {
    await seedAdFormats();
    const r = await request(app).get(api("/advertising/formats"));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(6);
    expect(r.body.data[0]).toMatchObject({ id: "header-banner", title: "Header Banner" });
  });

  it("is admin-only (ads:manage) — managers are forbidden", async () => {
    const { agent } = await signedInAgent("MANAGER");
    expect((await agent.get(api("/admin/ad-formats"))).status).toBe(403);
    expect((await request(app).post(api("/admin/ad-formats")).send({})).status).toBe(401);
  });

  it("supports create, update, hide, reorder and delete", async () => {
    await seedAdFormats();
    const { agent } = await signedInAgent("ADMIN");
    const c = await agent.post(api("/admin/ad-formats")).send({ key: "podcast", title: "Podcast Ads", description: "Sponsor our weekly aviation podcast", priceLabel: "From ₹15,000" });
    expect(c.status).toBe(201);
    expect((await agent.post(api("/admin/ad-formats")).send({ key: "podcast", title: "Dup", description: "Duplicate one" })).status).toBe(409);
    expect((await agent.post(api("/admin/ad-formats")).send({ key: "x", title: "", description: "" })).status).toBe(422);

    expect((await agent.patch(api("/admin/ad-formats/newsletter")).send({ active: false })).body.data.active).toBe(false);
    const pub = (await request(app).get(api("/advertising/formats"))).body.data.map((f: { id: string }) => f.id);
    expect(pub).not.toContain("newsletter");
    expect(pub).toContain("podcast");

    const all = (await agent.get(api("/admin/ad-formats"))).body.data.map((f: { id: string }) => f.id) as string[];
    const o = await agent.put(api("/admin/ad-formats/order")).send({ keys: ["podcast", ...all.filter((k) => k !== "podcast")] });
    expect(o.body.data[0].id).toBe("podcast");

    expect((await agent.delete(api("/admin/ad-formats/podcast"))).status).toBe(204);
    expect((await agent.patch(api("/admin/ad-formats/podcast")).send({ title: "Gone" })).status).toBe(404);
  });
});
