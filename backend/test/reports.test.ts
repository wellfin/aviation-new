import mongoose, { type Types } from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { Payment, Subscription } from "../src/modules/billing/billing.models.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import { LEADS_COLLECTION, NEWSLETTER_COLLECTION, truncUtc } from "../src/modules/reports/reports.service.js";
import { reportsRouter } from "../src/modules/reports/reports.routes.js";
import { Review } from "../src/modules/reviews/review.model.js";
import { User } from "../src/modules/users/user.model.js";
import { appWith, createUser, signedInAgent } from "./helpers.js";

const app = appWith(["/admin/reports", reportsRouter]);
const api = (p: string) => `/api/v1/admin/reports${p}`;

const at = (iso: string) => new Date(iso);

let n = 0;
async function provider(status: "draft" | "pending" | "published", tier: "basic" | "pro" | "ultra_pro" = "basic") {
  n += 1;
  return Provider.create({
    slug: `p-${n}`,
    name: `P ${n}`,
    status,
    tier,
    category: "fbo",
    countryCode: "IN",
    country: "India",
    city: "Delhi",
    summary: "s",
  });
}

async function setCreatedAt(model: mongoose.Model<never>, id: Types.ObjectId, date: Date) {
  await model.collection.updateOne({ _id: id }, { $set: { createdAt: date } });
}

async function payment(amount: number, paidAt: Date, status: "captured" | "failed" = "captured", currency = "INR") {
  const user = new mongoose.Types.ObjectId();
  const prov = new mongoose.Types.ObjectId();
  const sub = await Subscription.create({
    user,
    provider: prov,
    plan: "pro",
    billing: "monthly",
    razorpaySubscriptionId: `sub_${new mongoose.Types.ObjectId().toHexString()}`,
    razorpayPlanId: "plan_x",
    amount,
    currency,
  });
  return Payment.create({
    user,
    provider: prov,
    subscription: sub._id,
    plan: "pro",
    razorpayPaymentId: `pay_${new mongoose.Types.ObjectId().toHexString()}`,
    amount,
    currency,
    status,
    paidAt,
  });
}

describe("admin reports", () => {
  it("requires reports:read", async () => {
    expect((await request(app).get(api("/overview"))).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(api("/overview"))).status).toBe(401);
      expect((await agent.get(api("/timeseries?metric=users"))).status).toBe(401);
    }
    const { agent: manager } = await signedInAgent("MANAGER", app);
    expect((await manager.get(api("/overview"))).status).toBe(200);
  });

  it("returns a zeroed overview when there is no data (missing collections count as 0)", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const r = await agent.get(api("/overview"));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.users).toMatchObject({ total: 1, byRole: { USER: 0, PROVIDER: 0, MANAGER: 0, ADMIN: 1 }, newInRange: 1 });
    expect(d.providers).toMatchObject({ total: 0, pendingListings: 0, byTier: { basic: 0, pro: 0, ultra_pro: 0 } });
    expect(d.reviews).toEqual({ pending: 0, approved: 0, rejected: 0, total: 0 });
    expect(d.enquiries).toMatchObject({ inRange: 0, byStatus: { new: 0, read: 0, replied: 0, closed: 0, spam: 0 } });
    expect(d.leads).toEqual({ inRange: 0, byType: {} });
    expect(d.newsletter).toEqual({ subscribers: 0, pending: 0, unsubscribed: 0 });
    expect(d.revenue).toEqual({ byCurrency: [] });
    // Default range is the last 30 days.
    expect(new Date(d.range.to).getTime() - new Date(d.range.from).getTime()).toBe(30 * 86_400_000);
  });

  it("aggregates every section for the requested range", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const oldUser = await createUser({ role: "PROVIDER" });
    await setCreatedAt(User as unknown as mongoose.Model<never>, oldUser._id, at("2025-01-15T00:00:00Z"));
    const recent = await createUser();
    await setCreatedAt(User as unknown as mongoose.Model<never>, recent._id, at("2026-06-10T12:00:00Z"));

    const pub = await provider("published", "pro");
    await provider("published", "ultra_pro");
    await provider("pending");
    await provider("pending");
    await provider("draft");

    const reviewBase = { provider: pub._id, authorName: "A", rating: 5, title: "t", body: "b" };
    await Review.create([
      { ...reviewBase, author: new mongoose.Types.ObjectId(), status: "pending" },
      { ...reviewBase, author: new mongoose.Types.ObjectId(), status: "approved" },
      { ...reviewBase, author: new mongoose.Types.ObjectId(), status: "approved" },
    ]);

    const enquiryBase = { provider: pub._id, name: "N", email: "n@example.com", message: "Hello" };
    const [e1, e2, e3] = await Enquiry.create([
      { ...enquiryBase, status: "new" },
      { ...enquiryBase, status: "replied" },
      { ...enquiryBase, status: "new" },
    ]);
    await setCreatedAt(Enquiry as unknown as mongoose.Model<never>, e1!._id, at("2026-06-01T00:00:00Z"));
    await setCreatedAt(Enquiry as unknown as mongoose.Model<never>, e2!._id, at("2026-06-30T23:59:59Z"));
    await setCreatedAt(Enquiry as unknown as mongoose.Model<never>, e3!._id, at("2026-07-01T00:00:00Z"));

    const db = mongoose.connection.db!;
    await db.collection(LEADS_COLLECTION).insertMany([
      { type: "contact", createdAt: at("2026-06-05T00:00:00Z") },
      { type: "contact", createdAt: at("2026-06-06T00:00:00Z") },
      { type: "demo", createdAt: at("2026-06-07T00:00:00Z") },
      { type: "demo", createdAt: at("2026-08-07T00:00:00Z") },
    ]);
    await db.collection(NEWSLETTER_COLLECTION).insertMany([
      { email: "a@example.com", status: "subscribed" },
      { email: "b@example.com", status: "subscribed" },
      { email: "d@example.com", status: "pending" },
      { email: "c@example.com", status: "unsubscribed" },
    ]);

    await payment(499_900, at("2026-06-02T00:00:00Z"));
    await payment(999_950, at("2026-06-20T00:00:00Z"));
    await payment(100, at("2026-06-21T00:00:00Z"), "failed");
    await payment(5_000, at("2026-06-22T00:00:00Z"), "captured", "USD");
    await payment(7_777, at("2026-07-02T00:00:00Z"));

    const r = await agent.get(api("/overview?from=2026-06-01&to=2026-06-30"));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.range).toEqual({ from: "2026-06-01T00:00:00.000Z", to: "2026-07-01T00:00:00.000Z" });
    expect(d.users).toEqual({ total: 3, byRole: { USER: 1, PROVIDER: 1, MANAGER: 0, ADMIN: 1 }, newInRange: 1 });
    expect(d.providers).toEqual({
      total: 5,
      byStatus: { draft: 1, pending: 2, published: 2, rejected: 0, suspended: 0 },
      byTier: { basic: 3, pro: 1, ultra_pro: 1 },
      pendingListings: 2,
    });
    expect(d.reviews).toEqual({ pending: 1, approved: 2, rejected: 0, total: 3 });
    expect(d.enquiries).toEqual({ inRange: 2, byStatus: { new: 1, read: 0, replied: 1, closed: 0, spam: 0 } });
    expect(d.leads).toEqual({ inRange: 3, byType: { contact: 2, demo: 1 } });
    expect(d.newsletter).toEqual({ subscribers: 2, pending: 1, unsubscribed: 1 });
    expect(d.revenue.byCurrency).toEqual([
      { currency: "INR", amount: 1_499_850, payments: 2 },
      { currency: "USD", amount: 5_000, payments: 1 },
    ]);
  });

  it("validates the range", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.get(api("/overview?from=nope"))).status).toBe(422);
    expect((await agent.get(api("/overview?from=2026-02-30T00:00:00Z&to=bad"))).status).toBe(422);
    const inverted = await agent.get(api("/overview?from=2026-07-01&to=2026-06-01"));
    expect(inverted.status).toBe(422);
    expect(inverted.body.error.fieldErrors.from).toBeDefined();
    expect((await agent.get(api("/overview?from=2000-01-01&to=2026-01-01"))).status).toBe(422);
  });

  it("builds zero-filled time series per interval", async () => {
    const { agent, user: admin } = await signedInAgent("ADMIN", app);
    await setCreatedAt(User as unknown as mongoose.Model<never>, admin._id, at("2026-06-03T10:00:00Z"));
    for (const iso of ["2026-06-01T01:00:00Z", "2026-06-01T23:00:00Z", "2026-06-04T00:00:00Z"]) {
      const u = await createUser();
      await setCreatedAt(User as unknown as mongoose.Model<never>, u._id, at(iso));
    }

    const days = await agent.get(api("/timeseries?metric=users&interval=day&from=2026-06-01&to=2026-06-04"));
    expect(days.status).toBe(200);
    expect(days.body.data).toEqual([
      { period: "2026-06-01T00:00:00.000Z", value: 2 },
      { period: "2026-06-02T00:00:00.000Z", value: 0 },
      { period: "2026-06-03T00:00:00.000Z", value: 1 },
      { period: "2026-06-04T00:00:00.000Z", value: 1 },
    ]);

    // 2026-06-01 is a Monday: weeks start on Mondays.
    const weeks = await agent.get(api("/timeseries?metric=users&interval=week&from=2026-06-01&to=2026-06-14"));
    expect(weeks.body.data).toEqual([
      { period: "2026-06-01T00:00:00.000Z", value: 4 },
      { period: "2026-06-08T00:00:00.000Z", value: 0 },
    ]);

    await payment(1_000, at("2026-05-31T00:00:00Z"));
    await payment(2_000, at("2026-06-15T00:00:00Z"));
    await payment(3_000, at("2026-06-16T00:00:00Z"));
    await payment(9_999, at("2026-06-16T00:00:00Z"), "failed");
    await payment(4_000, at("2026-06-16T00:00:00Z"), "captured", "USD");
    const months = await agent.get(api("/timeseries?metric=revenue&interval=month&from=2026-05-01&to=2026-07-31"));
    expect(months.body.data).toEqual([
      { period: "2026-05-01T00:00:00.000Z", value: 1_000 },
      { period: "2026-06-01T00:00:00.000Z", value: 5_000 },
      { period: "2026-07-01T00:00:00.000Z", value: 0 },
    ]);
    const usd = await agent.get(api("/timeseries?metric=revenue&interval=month&from=2026-06-01&to=2026-06-30&currency=usd"));
    expect(usd.body.data).toEqual([{ period: "2026-06-01T00:00:00.000Z", value: 4_000 }]);

    const empty = await agent.get(api("/timeseries?metric=enquiries&interval=day&from=2026-06-01&to=2026-06-02"));
    expect(empty.body.data).toEqual([
      { period: "2026-06-01T00:00:00.000Z", value: 0 },
      { period: "2026-06-02T00:00:00.000Z", value: 0 },
    ]);
    const defaults = await agent.get(api("/timeseries?metric=reviews"));
    expect(defaults.status).toBe(200);
    expect(defaults.body.data.length).toBeGreaterThanOrEqual(30);
  });

  it("validates time series parameters", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const bad = await agent.get(api("/timeseries?metric=clicks&interval=hour"));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["metric", "interval"]));
    expect((await agent.get(api("/timeseries?metric=revenue&currency=rupees"))).status).toBe(422);
    // More than 366 daily buckets is refused.
    expect((await agent.get(api("/timeseries?metric=users&interval=day&from=2024-01-01&to=2026-01-01"))).status).toBe(422);
  });

  it("truncates to UTC day/week/month like $dateTrunc", () => {
    const d = at("2026-06-07T18:30:00Z"); // Sunday
    expect(truncUtc(d, "day").toISOString()).toBe("2026-06-07T00:00:00.000Z");
    expect(truncUtc(d, "week").toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(truncUtc(d, "month").toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});
