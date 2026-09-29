import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { adminNewsletterRouter, newsletterRouter } from "../src/modules/newsletter/newsletter.routes.js";
import { Subscriber } from "../src/modules/newsletter/subscriber.model.js";
import { appWith, ORIGIN, signedInAgent } from "./helpers.js";

const app = appWith(["/newsletter", newsletterRouter], ["/admin/newsletter", adminNewsletterRouter]);
const subscribe = (body: object) => request(app).post("/api/v1/newsletter/subscriptions").set("Origin", ORIGIN).send(body);

/** Pulls the API-relative path of the last link of `kind` emailed to `to`. */
async function linkFor(to: string, kind: "confirm" | "unsubscribe"): Promise<string> {
  let path = "";
  await vi.waitFor(() => {
    const msg = [...testOutbox].reverse().find((m) => m.to === to && m.text.includes(`/newsletter/${kind}?token=`));
    const url = msg?.text.match(/https?:\/\/\S+/g)?.find((u) => u.includes(`/newsletter/${kind}`));
    expect(url).toBeDefined();
    expect(url!.startsWith(`${env.PUBLIC_API_URL}/api/v1/newsletter/${kind}?token=`)).toBe(true);
    path = new URL(url!).pathname + new URL(url!).search;
  });
  return path;
}

describe("newsletter double opt-in", () => {
  it("subscribes, confirms, and unsubscribes via emailed links", async () => {
    const email = "Pilot@Example.com";
    const r = await subscribe({ email });
    expect(r.status).toBe(200);
    const generic = r.body;
    expect(await Subscriber.findOne({ email: "pilot@example.com" }).lean()).toMatchObject({ status: "pending", source: "website" });

    const confirm = await request(app).get(await linkFor("pilot@example.com", "confirm"));
    expect(confirm.status).toBe(302);
    expect(confirm.headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=confirmed`);
    expect((await Subscriber.findOne({ email: "pilot@example.com" }).lean())?.status).toBe("subscribed");

    // Confirm tokens are single-use.
    const reuse = await request(app).get(await linkFor("pilot@example.com", "confirm"));
    expect(reuse.headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=invalid`);

    // Subscribing again while subscribed returns the same generic response and sends nothing.
    const outboxBefore = testOutbox.length;
    const again = await subscribe({ email });
    expect(again.status).toBe(200);
    expect(again.body).toEqual(generic);
    expect(testOutbox.length).toBe(outboxBefore);

    const unsubPath = await linkFor("pilot@example.com", "unsubscribe");
    const unsub = await request(app).get(unsubPath);
    expect(unsub.headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=unsubscribed`);
    expect((await Subscriber.findOne({ email: "pilot@example.com" }).lean())?.status).toBe("unsubscribed");
    // Idempotent.
    expect((await request(app).get(unsubPath)).headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=unsubscribed`);
  });

  it("lets an unsubscribed address opt in again", async () => {
    await Subscriber.create({ email: "back@example.com", status: "unsubscribed", unsubscribedAt: new Date() });
    await subscribe({ email: "back@example.com" });
    expect((await Subscriber.findOne({ email: "back@example.com" }).lean())?.status).toBe("pending");
    const r = await request(app).get(await linkFor("back@example.com", "confirm"));
    expect(r.headers.location).toMatch(/newsletter=confirmed$/);
  });

  it("stores only token hashes", async () => {
    await subscribe({ email: "hash@example.com" });
    const path = await linkFor("hash@example.com", "confirm");
    const token = new URL(`http://x${path}`).searchParams.get("token")!;
    const doc = await Subscriber.findOne({ email: "hash@example.com" }).select("+confirmTokenHash").lean();
    expect(doc?.confirmTokenHash).toBeDefined();
    expect(doc?.confirmTokenHash).not.toBe(token);
    expect(JSON.stringify(doc)).not.toContain(token);
  });

  it("throttles repeat confirmation emails", async () => {
    await subscribe({ email: "spam@example.com" });
    await subscribe({ email: "spam@example.com" });
    await vi.waitFor(() => expect(testOutbox.filter((m) => m.to === "spam@example.com")).toHaveLength(1));
  });

  it("rejects expired, unknown and malformed tokens with a redirect", async () => {
    await subscribe({ email: "late@example.com" });
    const path = await linkFor("late@example.com", "confirm");
    await Subscriber.updateOne({ email: "late@example.com" }, { $set: { confirmTokenExpiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(path)).headers.location).toMatch(/newsletter=invalid$/);
    for (const q of ["", "?token=short", `?token=${"a".repeat(43)}`]) {
      const r = await request(app).get(`/api/v1/newsletter/confirm${q}`);
      expect(r.status).toBe(302);
      expect(r.headers.location).toMatch(/newsletter=invalid$/);
      expect((await request(app).get(`/api/v1/newsletter/unsubscribe${q}`)).headers.location).toMatch(/newsletter=invalid$/);
    }
  });

  it("validates the email and ignores honeypot hits", async () => {
    const bad = await subscribe({ email: "nope" });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fieldErrors).toHaveProperty("email");
    const bot = await subscribe({ email: "bot@example.com", website: "x" });
    expect(bot.status).toBe(200);
    expect(await Subscriber.countDocuments()).toBe(0);
  });
});

describe("newsletter admin", () => {
  it("requires leads:read", async () => {
    expect((await request(app).get("/api/v1/admin/newsletter/subscribers")).status).toBe(401);
    const { agent } = await signedInAgent("PROVIDER", app);
    expect((await agent.get("/api/v1/admin/newsletter/subscribers")).status).toBe(401);
  });

  it("lists, filters and exports subscribers", async () => {
    await Subscriber.create([
      { email: "a@example.com", status: "subscribed", confirmedAt: new Date() },
      { email: "b@example.com", status: "pending" },
      { email: "=cmd@example.com", status: "subscribed" },
    ]);
    const { agent } = await signedInAgent("MANAGER", app);
    const all = await agent.get("/api/v1/admin/newsletter/subscribers");
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(3);
    expect(JSON.stringify(all.body)).not.toMatch(/TokenHash/);
    expect((await agent.get("/api/v1/admin/newsletter/subscribers?status=pending")).body.data.total).toBe(1);
    expect((await agent.get("/api/v1/admin/newsletter/subscribers?q=a@ex")).body.data.total).toBe(1);
    expect((await agent.get("/api/v1/admin/newsletter/subscribers?status=gone")).status).toBe(422);

    const csv = await agent.get("/api/v1/admin/newsletter/subscribers/export.csv?status=subscribed");
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toMatch(/^text\/csv/);
    const text = csv.text.replace(new RegExp("^\\uFEFF"), "");
    expect(text.split("\r\n")[0]).toBe("email,status,source,createdAt,confirmedAt,unsubscribedAt");
    expect(text).toContain("'=cmd@example.com");
    expect(text).not.toContain("b@example.com");
  });
});
