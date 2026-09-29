import type { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { env } from "../src/config/env.js";
import { hmacSha256Hex } from "../src/lib/crypto.js";
import { Payment, Subscription, WebhookEvent } from "../src/modules/billing/billing.models.js";
import { adminBillingRouter, billingRouter } from "../src/modules/billing/billing.routes.js";
import type { BillingPlan } from "../src/modules/billing/billing.plans.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import { appWith, ORIGIN, signedInAgent } from "./helpers.js";

const PLANS: Record<string, BillingPlan> = {
  pro: { id: "pro", name: "Pro", monthlyPrice: 4999, yearlyPrice: 49_990, currency: "INR", razorpayPlanIds: { monthly: "plan_ProMonthly01", yearly: "plan_ProYearly01" } },
  ultra_pro: { id: "ultra_pro", name: "Ultra Pro", monthlyPrice: 9999.5, yearlyPrice: null, currency: "INR", razorpayPlanIds: { monthly: "plan_UltraMonthly1" } },
};

vi.mock("../src/modules/pricing/pricing.service.js", () => ({
  getPlanForBilling: vi.fn(async (id: string) => PLANS[id] ?? null),
}));

const app = appWith(["/billing", billingRouter], ["/admin/billing", adminBillingRouter]);
const KEY_SECRET = "rzp_test_secret";
const WEBHOOK_SECRET = "rzp_test_webhook_secret";

type Agent = Awaited<ReturnType<typeof signedInAgent>>["agent"];
interface FetchCall {
  url: string;
  method: string;
  auth: string | null;
  body: Record<string, unknown> | null;
}

let fetchSpy: MockInstance<typeof fetch>;
let calls: FetchCall[];
let subCounter = 0;

beforeEach(() => {
  calls = [];
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization"), body });
    const cancel = url.match(/\/v1\/subscriptions\/([^/]+)\/cancel$/);
    if (cancel) {
      return Response.json({ id: cancel[1], status: "active", current_end: 1_900_000_000 });
    }
    if (url.endsWith("/v1/subscriptions")) {
      subCounter += 1;
      return Response.json({ id: `sub_Test${String(subCounter).padStart(8, "0")}`, status: "created", plan_id: body?.plan_id });
    }
    return Response.json({ error: { code: "BAD_REQUEST_ERROR", description: "unknown" } }, { status: 400 });
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.restoreAllMocks();
});

let slugCounter = 0;
async function createListing(ownerId: Types.ObjectId | undefined, tier: "basic" | "pro" | "ultra_pro" = "basic") {
  slugCounter += 1;
  return Provider.create({
    slug: `jet-co-${slugCounter}`,
    name: `Jet Co ${slugCounter}`,
    owner: ownerId,
    status: "published",
    tier,
    category: "fbo",
    countryCode: "IN",
    country: "India",
    city: "Mumbai",
    summary: "FBO services",
  });
}

async function providerWithListing() {
  const { agent, user } = await signedInAgent("PROVIDER", app);
  const listing = await createListing(user._id);
  return { agent, user, listing };
}

async function subscribe(agent: Agent, plan = "pro", billing = "monthly") {
  const r = await agent.post("/api/v1/billing/subscriptions").set("Origin", ORIGIN).send({ plan, billing });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body.data as { subscriptionId: string; amount: number };
}

function checkoutSignature(paymentId: string, subscriptionId: string) {
  return hmacSha256Hex(KEY_SECRET, `${paymentId}|${subscriptionId}`);
}

function verify(agent: Agent, subscriptionId: string, paymentId = "pay_Verify000001", signature = checkoutSignature(paymentId, subscriptionId)) {
  return agent.post("/api/v1/billing/subscriptions/verify").send({
    razorpay_payment_id: paymentId,
    razorpay_subscription_id: subscriptionId,
    razorpay_signature: signature,
  });
}

let eventCounter = 0;
function webhook(event: string, payload: Record<string, unknown>, opts: { eventId?: string; signature?: string } = {}) {
  eventCounter += 1;
  const raw = JSON.stringify({ entity: "event", event, payload, created_at: 1_800_000_000 });
  return request(app)
    .post("/api/v1/billing/webhooks/razorpay")
    .set("Content-Type", "application/json")
    .set("X-Razorpay-Event-Id", opts.eventId ?? `evt_${eventCounter}_${Date.now()}`)
    .set("X-Razorpay-Signature", opts.signature ?? hmacSha256Hex(WEBHOOK_SECRET, raw))
    .send(raw);
}

const subPayload = (id: string, extra: Record<string, unknown> = {}) => ({
  subscription: { entity: { id, status: "active", current_start: 1_800_000_000, current_end: 1_802_592_000, ...extra } },
});
const paymentPayload = (id: string, amount = 499_900, status = "captured") => ({
  payment: { entity: { id, amount, currency: "INR", status, method: "card", invoice_id: "inv_Test0001", created_at: 1_800_000_100 } },
});

describe("billing: access control", () => {
  it("requires sign-in and the provider billing permission", async () => {
    expect((await request(app).post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" })).status).toBe(401);
    expect((await request(app).get("/api/v1/billing/subscription")).status).toBe(401);
    const { agent } = await signedInAgent("USER", app);
    expect((await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" })).status).toBe(403);
    expect((await agent.get("/api/v1/billing/payments")).status).toBe(403);
    // Staff have no website session at all.
    const { agent: manager } = await signedInAgent("MANAGER", app);
    expect((await manager.get("/api/v1/billing/payments")).status).toBe(401);
  });

  it("restricts admin billing reports to billing:read:any", async () => {
    expect((await request(app).get("/api/v1/admin/billing/payments")).status).toBe(401);
    const { agent: provider } = await signedInAgent("PROVIDER", app);
    expect((await provider.get("/api/v1/admin/billing/subscriptions")).status).toBe(401);
    const { agent: manager } = await signedInAgent("MANAGER", app);
    expect((await manager.get("/api/v1/admin/billing/subscriptions")).status).toBe(403);
  });
});

describe("billing: subscriptions", () => {
  it("returns 503 when Razorpay is not configured", async () => {
    const { agent } = await providerWithListing();
    const saved = env.RAZORPAY_KEY_ID;
    env.RAZORPAY_KEY_ID = undefined;
    try {
      const r = await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" });
      expect(r.status).toBe(503);
      expect(r.body.error.message).toBe("Payments are not configured");
    } finally {
      env.RAZORPAY_KEY_ID = saved;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports a missing listing before missing payment configuration", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    const saved = env.RAZORPAY_KEY_ID;
    env.RAZORPAY_KEY_ID = undefined;
    try {
      const r = await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("NO_LISTING");
    } finally {
      env.RAZORPAY_KEY_ID = saved;
    }
  });

  it("validates the body and requires a listing", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    const bad = await agent.post("/api/v1/billing/subscriptions").send({ plan: "enterprise", billing: "weekly" });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["plan", "billing"]));
    const none = await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" });
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe("NO_LISTING");
  });

  it("rejects a providerId for a listing the account doesn't own", async () => {
    const { agent, listing } = await providerWithListing();
    const other = await createListing(undefined);
    expect((await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly", providerId: other.id })).status).toBe(404);
    expect((await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly", providerId: listing.id })).status).toBe(201);
  });

  it("creates a Razorpay subscription and returns checkout details", async () => {
    const { agent, user, listing } = await providerWithListing();
    const r = await agent.post("/api/v1/billing/subscriptions").set("Origin", ORIGIN).send({ plan: "pro", billing: "monthly" });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      keyId: "rzp_test_key",
      plan: "pro",
      billing: "monthly",
      amount: 499_900,
      currency: "INR",
      prefill: { name: `${user.firstName} ${user.lastName}`, email: user.email, contact: "" },
    });
    expect(JSON.stringify(r.body)).not.toContain(KEY_SECRET);

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe("https://api.razorpay.com/v1/subscriptions");
    expect(call.method).toBe("POST");
    expect(call.auth).toBe(`Basic ${Buffer.from(`rzp_test_key:${KEY_SECRET}`).toString("base64")}`);
    expect(call.body).toMatchObject({ plan_id: "plan_ProMonthly01", total_count: 120, notes: { userId: user.id, providerId: listing.id } });

    const sub = await Subscription.findOne({ razorpaySubscriptionId: r.body.data.subscriptionId });
    expect(sub).toMatchObject({ status: "created", plan: "pro", billing: "monthly", amount: 499_900, currency: "INR" });
    expect(String(sub?.provider)).toBe(listing.id);
  });

  it("stores fractional prices as integer paise and refuses unsellable cycles", async () => {
    const { agent } = await providerWithListing();
    expect((await subscribe(agent, "ultra_pro", "monthly")).amount).toBe(999_950);
    const { agent: other } = await providerWithListing();
    const r = await other.post("/api/v1/billing/subscriptions").send({ plan: "ultra_pro", billing: "yearly" });
    expect(r.status).toBe(503);
  });

  it("surfaces Razorpay failures as 502 without storing anything", async () => {
    const { agent } = await providerWithListing();
    fetchSpy.mockResolvedValueOnce(Response.json({ error: { code: "BAD_REQUEST_ERROR", description: "bad plan" } }, { status: 400 }));
    const r = await agent.post("/api/v1/billing/subscriptions").send({ plan: "pro", billing: "monthly" });
    expect(r.status).toBe(502);
    expect(await Subscription.countDocuments()).toBe(0);
  });

  it("verifies the checkout signature and upgrades the listing atomically", async () => {
    const { agent, listing } = await providerWithListing();
    const { subscriptionId } = await subscribe(agent);

    const forged = await verify(agent, subscriptionId, "pay_Verify000001", "0".repeat(64));
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe("INVALID_SIGNATURE");
    expect((await Provider.findById(listing._id))?.tier).toBe("basic");
    expect(await Payment.countDocuments()).toBe(0);

    const bad = await verify(agent, subscriptionId, "pay_Verify000001", "not-hex");
    expect(bad.status).toBe(422);

    const ok = await verify(agent, subscriptionId);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: "active", plan: "pro", cancelAtPeriodEnd: false });
    expect(ok.body.data.currentPeriodEnd).not.toBeNull();
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");
    const payment = await Payment.findOne({ razorpayPaymentId: "pay_Verify000001" });
    expect(payment).toMatchObject({ status: "authorized", amount: 499_900, currency: "INR" });

    // Replaying the same callback is harmless.
    expect((await verify(agent, subscriptionId)).status).toBe(200);
    expect(await Payment.countDocuments()).toBe(1);
  });

  it("rolls back the status and payment when the tier update fails", async () => {
    const { agent, listing } = await providerWithListing();
    const { subscriptionId } = await subscribe(agent);
    vi.spyOn(Provider, "updateOne").mockRejectedValueOnce(new Error("simulated failure"));
    expect((await verify(agent, subscriptionId)).status).toBe(500);
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("created");
    expect(await Payment.countDocuments()).toBe(0);
    expect((await Provider.findById(listing._id))?.tier).toBe("basic");
  });

  it("blocks a second subscription while one is active", async () => {
    const { agent } = await providerWithListing();
    const { subscriptionId } = await subscribe(agent);
    // An unpaid checkout doesn't block a retry…
    await subscribe(agent, "ultra_pro");
    await verify(agent, subscriptionId);
    // …but an active subscription does.
    const r = await agent.post("/api/v1/billing/subscriptions").send({ plan: "ultra_pro", billing: "monthly" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("ALREADY_SUBSCRIBED");
  });

  it("shows the current subscription, cancels at cycle end and lists own payments", async () => {
    const { agent, listing } = await providerWithListing();
    const empty = await agent.get("/api/v1/billing/subscription");
    expect(empty.body.data).toEqual({ subscription: null, plan: null, listing: null });
    expect((await agent.post("/api/v1/billing/subscription/cancel")).status).toBe(404);

    const { subscriptionId } = await subscribe(agent);
    await verify(agent, subscriptionId);

    const current = await agent.get("/api/v1/billing/subscription");
    expect(current.body.data.subscription).toMatchObject({ razorpaySubscriptionId: subscriptionId, status: "active" });
    expect(current.body.data.plan).toEqual({ id: "pro", name: "Pro", monthlyPrice: 4999, yearlyPrice: 49_990, currency: "INR" });
    expect(current.body.data.listing).toMatchObject({ id: listing.id, tier: "pro" });
    expect(JSON.stringify(current.body)).not.toContain("plan_ProMonthly01");

    const cancel = await agent.post("/api/v1/billing/subscription/cancel");
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.cancelAtPeriodEnd).toBe(true);
    expect(cancel.body.data.currentPeriodEnd).toBe(new Date(1_900_000_000 * 1000).toISOString());
    const cancelCall = calls.find((c) => c.url.endsWith(`/subscriptions/${subscriptionId}/cancel`));
    expect(cancelCall?.body).toEqual({ cancel_at_cycle_end: 1 });
    // Tier stays until Razorpay reports the end of the cycle.
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");
    // Cancelling again is idempotent and doesn't call Razorpay.
    const before = calls.length;
    expect((await agent.post("/api/v1/billing/subscription/cancel")).status).toBe(200);
    expect(calls.length).toBe(before);

    const payments = await agent.get("/api/v1/billing/payments?pageSize=5");
    expect(payments.body.data).toMatchObject({ total: 1, pageSize: 5 });
    expect(payments.body.data.items[0]).toMatchObject({ razorpayPaymentId: "pay_Verify000001", amount: 499_900 });
  });

  it("keeps each provider's billing private", async () => {
    const a = await providerWithListing();
    const b = await providerWithListing();
    const { subscriptionId } = await subscribe(a.agent);
    await verify(a.agent, subscriptionId);

    // B can't verify, see, cancel or list A's subscription/payments.
    expect((await verify(b.agent, subscriptionId, "pay_Verify000002")).status).toBe(404);
    expect((await b.agent.get("/api/v1/billing/subscription")).body.data.subscription).toBeNull();
    expect((await b.agent.post("/api/v1/billing/subscription/cancel")).status).toBe(404);
    expect((await b.agent.get("/api/v1/billing/payments")).body.data.total).toBe(0);
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.cancelAtPeriodEnd).toBe(false);
  });
});

describe("billing: Razorpay webhooks", () => {
  async function activeSubscription() {
    const ctx = await providerWithListing();
    const { subscriptionId } = await subscribe(ctx.agent);
    return { ...ctx, subscriptionId };
  }

  it("rejects missing or invalid signatures", async () => {
    const { subscriptionId } = await activeSubscription();
    expect((await webhook("subscription.activated", subPayload(subscriptionId), { signature: "a".repeat(64) })).status).toBe(400);
    const unsigned = await request(app).post("/api/v1/billing/webhooks/razorpay").set("Content-Type", "application/json").send("{}");
    expect(unsigned.status).toBe(400);
    expect(await WebhookEvent.countDocuments()).toBe(0);
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("created");
  });

  it("returns 503 when the webhook secret is not configured", async () => {
    const saved = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = undefined;
    try {
      expect((await webhook("subscription.activated", subPayload("sub_Unknown0001"))).status).toBe(503);
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });

  it("activates and charges: records the captured payment, period and tier", async () => {
    const { subscriptionId, listing } = await activeSubscription();
    const act = await webhook("subscription.activated", subPayload(subscriptionId));
    expect(act.status).toBe(200);
    expect(act.body.data.outcome).toBe("processed");
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");

    const charged = await webhook("subscription.charged", { ...subPayload(subscriptionId), ...paymentPayload("pay_Charge000001") });
    expect(charged.status).toBe(200);
    const sub = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
    expect(sub?.status).toBe("active");
    expect(sub?.currentPeriodEnd?.toISOString()).toBe(new Date(1_802_592_000 * 1000).toISOString());
    const payment = await Payment.findOne({ razorpayPaymentId: "pay_Charge000001" });
    expect(payment).toMatchObject({ status: "captured", amount: 499_900, currency: "INR", method: "card", razorpayInvoiceId: "inv_Test0001" });
  });

  it("upgrades the authorized checkout payment to captured when the charge arrives", async () => {
    const { agent, subscriptionId } = await activeSubscription();
    await verify(agent, subscriptionId, "pay_Same00000001");
    await webhook("subscription.charged", { ...subPayload(subscriptionId), ...paymentPayload("pay_Same00000001") });
    const payments = await Payment.find();
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe("captured");
  });

  it("is idempotent for replayed deliveries", async () => {
    const { subscriptionId } = await activeSubscription();
    const payload = { ...subPayload(subscriptionId), ...paymentPayload("pay_Replay000001") };
    const first = await webhook("subscription.charged", payload, { eventId: "evt_Replay1" });
    const again = await webhook("subscription.charged", payload, { eventId: "evt_Replay1" });
    expect(first.body.data.outcome).toBe("processed");
    expect(again.status).toBe(200);
    expect(again.body.data.outcome).toBe("duplicate");
    expect(await Payment.countDocuments()).toBe(1);
    expect(await WebhookEvent.countDocuments({ eventId: "evt_Replay1" })).toBe(1);
  });

  it("does not record the event when applying it fails, so Razorpay's retry succeeds", async () => {
    const { subscriptionId, listing } = await activeSubscription();
    vi.spyOn(Provider, "updateOne").mockRejectedValueOnce(new Error("simulated failure"));
    const payload = { ...subPayload(subscriptionId), ...paymentPayload("pay_Retry0000001") };
    expect((await webhook("subscription.charged", payload, { eventId: "evt_Retry1" })).status).toBe(500);
    expect(await WebhookEvent.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("created");

    expect((await webhook("subscription.charged", payload, { eventId: "evt_Retry1" })).body.data.outcome).toBe("processed");
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");
    expect(await Payment.countDocuments()).toBe(1);
  });

  it("downgrades to basic when the subscription ends and ignores late events", async () => {
    const { subscriptionId, listing } = await activeSubscription();
    await webhook("subscription.activated", subPayload(subscriptionId));
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");

    await webhook("subscription.cancelled", subPayload(subscriptionId, { status: "cancelled" }));
    const sub = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
    expect(sub?.status).toBe("cancelled");
    expect(sub?.endedAt).toBeInstanceOf(Date);
    expect((await Provider.findById(listing._id))?.tier).toBe("basic");

    const late = await webhook("subscription.charged", { ...subPayload(subscriptionId), ...paymentPayload("pay_Late00000001") });
    expect(late.body.data.outcome).toBe("ignored");
    expect((await Provider.findById(listing._id))?.tier).toBe("basic");
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("cancelled");
  });

  it("handles halted, pending, completed and payment.failed", async () => {
    const { subscriptionId, listing } = await activeSubscription();
    await webhook("subscription.activated", subPayload(subscriptionId));
    await webhook("subscription.pending", subPayload(subscriptionId));
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("pending");
    expect((await Provider.findById(listing._id))?.tier).toBe("pro");

    await webhook("payment.failed", { payment: { entity: { ...paymentPayload("pay_Failed000001", 499_900, "failed").payment.entity, subscription_id: subscriptionId, error_description: "Card declined" } } });
    expect(await Payment.findOne({ razorpayPaymentId: "pay_Failed000001" })).toMatchObject({ status: "failed", errorDescription: "Card declined" });

    await webhook("subscription.halted", subPayload(subscriptionId));
    expect((await Subscription.findOne({ razorpaySubscriptionId: subscriptionId }))?.status).toBe("halted");
    expect((await Provider.findById(listing._id))?.tier).toBe("basic");

    const other = await activeSubscription();
    await webhook("subscription.charged", { ...subPayload(other.subscriptionId), ...paymentPayload("pay_Other0000001") });
    await webhook("subscription.completed", subPayload(other.subscriptionId));
    expect((await Subscription.findOne({ razorpaySubscriptionId: other.subscriptionId }))?.status).toBe("completed");
    expect((await Provider.findById(other.listing._id))?.tier).toBe("basic");
  });

  it("acknowledges unknown events and subscriptions with 200", async () => {
    const unknownSub = await webhook("subscription.activated", subPayload("sub_NotOurs00001"));
    expect(unknownSub.status).toBe(200);
    expect(unknownSub.body.data.outcome).toBe("ignored");
    const unknownEvent = await webhook("order.paid", {});
    expect(unknownEvent.status).toBe(200);
    expect(unknownEvent.body.data.outcome).toBe("ignored");
  });
});

describe("billing: admin", () => {
  it("lists subscriptions with filters and payments with captured totals", async () => {
    const { agent: admin } = await signedInAgent("ADMIN", app);
    const a = await providerWithListing();
    const b = await providerWithListing();
    const subA = (await subscribe(a.agent)).subscriptionId;
    const subB = (await subscribe(b.agent, "ultra_pro")).subscriptionId;
    await webhook("subscription.charged", { ...subPayload(subA), ...paymentPayload("pay_AdminA000001", 499_900) });
    await webhook("subscription.charged", { ...subPayload(subB), ...paymentPayload("pay_AdminB000001", 999_950) });
    await webhook("payment.failed", { payment: { entity: { ...paymentPayload("pay_AdminF000001", 999_950, "failed").payment.entity, subscription_id: subB } } });

    const subs = await admin.get("/api/v1/admin/billing/subscriptions?status=active&pageSize=10");
    expect(subs.status).toBe(200);
    expect(subs.body.data.total).toBe(2);
    expect(subs.body.data.items[0].user.email).toBeDefined();
    expect(subs.body.data.items[0].listing.slug).toMatch(/^jet-co-/);
    expect(subs.body.data.items[0].providerId).toBe(subs.body.data.items[0].listing.id);
    expect((await admin.get("/api/v1/admin/billing/subscriptions?plan=ultra_pro")).body.data.total).toBe(1);
    expect((await admin.get("/api/v1/admin/billing/subscriptions?status=bogus")).status).toBe(422);

    const payments = await admin.get("/api/v1/admin/billing/payments?from=2020-01-01&to=2030-12-31");
    expect(payments.status).toBe(200);
    expect(payments.body.data.total).toBe(3);
    expect(payments.body.data.totals).toEqual([{ currency: "INR", capturedAmount: 1_499_850, capturedCount: 2 }]);
    expect((await admin.get("/api/v1/admin/billing/payments?status=failed")).body.data.total).toBe(1);

    const outOfRange = await admin.get("/api/v1/admin/billing/payments?from=2031-01-01");
    expect(outOfRange.body.data).toMatchObject({ total: 0, items: [], totals: [] });
    expect((await admin.get("/api/v1/admin/billing/payments?from=2030-01-01&to=2020-01-01")).status).toBe(422);
    expect((await admin.get("/api/v1/admin/billing/payments?from=yesterday")).status).toBe(422);
  });
});
