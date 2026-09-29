import request from "supertest";
import { describe, expect, it } from "vitest";
import { seedContent } from "../src/modules/news/content.seed.js";
import { adminPricingRouter, pricingRouter } from "../src/modules/pricing/pricing.routes.js";
import { getPlanForBilling } from "../src/modules/pricing/pricing.service.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/pricing", pricingRouter], ["/admin/pricing", adminPricingRouter]);
const admin = (p = "") => `/api/v1/admin/pricing/plans${p}`;

const plan = <T extends object = object>(over?: T) => ({
  name: "Enterprise",
  tagline: "For fleets and networks",
  monthlyPrice: null,
  yearlyPrice: null,
  features: ["Everything in Ultra Pro", "Dedicated manager"],
  cta: "Contact Sales",
  order: 3,
  ...over,
});

describe("pricing — public", () => {
  it("returns an empty list when no plans exist", async () => {
    expect((await request(app).get("/api/v1/pricing/plans")).body.data).toEqual([]);
  });

  it("lists active plans in order as PricingPlan[] without Razorpay ids", async () => {
    await seedContent();
    const { agent } = await signedInAgent("ADMIN", app);
    await agent.put(admin("/pro")).send(plan({ name: "Pro", monthlyPrice: 5, yearlyPrice: 49, highlighted: true, cta: "Start Pro Plan", order: 1, razorpayPlanIds: { monthly: "plan_ABC123xyz" } }));
    await agent.put(admin("/enterprise")).send(plan({ active: false }));

    const r = await request(app).get("/api/v1/pricing/plans");
    expect(r.status).toBe(200);
    expect(r.body.data.map((p: { id: string }) => p.id)).toEqual(["basic", "pro", "ultra_pro"]);
    expect(Object.keys(r.body.data[1]).sort()).toEqual(["cta", "currency", "features", "highlighted", "id", "monthlyPrice", "name", "tagline", "yearlyPrice"]);
    expect(JSON.stringify(r.body)).not.toMatch(/razorpay|plan_ABC/i);
  });
});

describe("pricing — admin", () => {
  it("requires pricing:manage (admins only)", async () => {
    expect((await request(app).get(admin())).status).toBe(401);
    const { agent } = await signedInAgent("MANAGER", app);
    expect((await agent.get(admin())).status).toBe(403);
    expect((await agent.put(admin("/pro")).send(plan())).status).toBe(403);
  });

  it("upserts (201 then 200), keeps Razorpay ids unless explicitly changed", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    const c = await agent.put(admin("/enterprise")).send(plan({ razorpayPlanIds: { monthly: "plan_Mon12345", yearly: "plan_Year12345" } }));
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ id: "enterprise", currency: "INR", active: true, razorpayPlanIds: { monthly: "plan_Mon12345", yearly: "plan_Year12345" } });

    const u = await agent.put(admin("/enterprise")).send(plan({ name: "Enterprise+" }));
    expect(u.status).toBe(200);
    expect(u.body.data).toMatchObject({ name: "Enterprise+", razorpayPlanIds: { monthly: "plan_Mon12345", yearly: "plan_Year12345" } });

    const cleared = await agent.put(admin("/enterprise")).send(plan({ razorpayPlanIds: { yearly: null } }));
    expect(cleared.body.data.razorpayPlanIds).toEqual({ monthly: "plan_Mon12345", yearly: null });

    expect((await agent.get(admin("/enterprise"))).body.data.name).toBe("Enterprise");
    expect((await agent.get(admin())).body.data).toHaveLength(1);
  });

  it("validates plan id and body, 404s missing plans", async () => {
    const { agent } = await signedInAgent("ADMIN", app);
    expect((await agent.put(admin("/gold")).send(plan())).status).toBe(422);
    const bad = await agent.put(admin("/pro")).send(plan({ monthlyPrice: -1, currency: "rupees", razorpayPlanIds: { monthly: "not-a-plan" } }));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["monthlyPrice", "currency", "razorpayPlanIds.monthly"]));
    expect((await agent.get(admin("/pro"))).status).toBe(404);
  });

  it("exposes the internal plan to billing", async () => {
    await seedContent();
    expect(await getPlanForBilling("enterprise")).toBeNull();
    const pro = await getPlanForBilling("pro");
    expect(pro).toMatchObject({ id: "pro", monthlyPrice: 5, yearlyPrice: 49, currency: "INR", active: true, razorpayPlanIds: { monthly: null, yearly: null } });
  });
});
