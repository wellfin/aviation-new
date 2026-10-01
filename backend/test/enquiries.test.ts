import request from "supertest";
import { describe, expect, it } from "vitest";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import {
  adminEnquiriesRouter,
  enquiriesRouter,
  myEnquiriesRouter,
  providerEnquiriesRouter,
} from "../src/modules/enquiries/enquiry.routes.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import type { UserDoc } from "../src/modules/users/user.model.js";
import { appWith, createUser, lastCodeFor, ORIGIN, proveEmail, signedInAgent } from "./helpers.js";

const app = appWith(
  ["/providers", providerEnquiriesRouter],
  ["/enquiries", enquiriesRouter],
  ["/me/enquiries", myEnquiriesRouter],
  ["/admin/enquiries", adminEnquiriesRouter],
);

let seq = 0;
async function makeProvider(
  overrides: Partial<{ status: "draft" | "published"; tier: "basic" | "pro" | "ultra_pro"; owner: UserDoc["_id"]; contactEmail: string }> = {},
) {
  seq += 1;
  return Provider.create({
    slug: `charter-co-${seq}`,
    name: `Charter Co ${seq}`,
    status: overrides.status ?? "published",
    tier: overrides.tier ?? "pro",
    owner: overrides.owner,
    category: "charter-operator",
    countryCode: "AE",
    country: "United Arab Emirates",
    city: "Dubai",
    summary: "Private jet charter.",
    contact: { email: overrides.contactEmail ?? `ops${seq}@charter.example` },
    services: [{ name: "Aircraft Charter" }, { name: "Fuel" }],
    fleet: [{ model: "Gulfstream G650", category: "Ultra Long Range", seats: 14, rangeNm: 7000, speedKts: 516 }],
  });
}

/** A departure day comfortably in the future, whenever the suite runs. */
const FUTURE_DAY = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const PAST_DAY = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

const general = { name: "Ann Lee", email: "Ann@Example.com", dialCode: "+44", phone: "7700 900123", service: "Fuel", message: "Need a fuel quote for Friday." };

function uiFleet(slug: string, aircraftId: string) {
  return {
    providerSlug: slug,
    aircraftId,
    tripType: "one-way",
    from: "OMDB",
    to: "EGLL",
    date: FUTURE_DAY,
    time: "09:30",
    passengers: "6",
    name: "Sam Pilot",
    company: "Acme Corp",
    email: "sam@example.com",
    dialCode: "+971",
    phone: "50 123 4567",
    message: "",
    service: "Aircraft charter",
  };
}

const rawPost = (path: string) => request(app).post(`/api/v1${path}`).set("Origin", ORIGIN);
/** Submits like a visitor who has already verified their email with the one-time code. */
const post = (path: string) => ({
  send: async (body: Record<string, unknown>) => {
    if (typeof body.email === "string") await proveEmail("enquiry_email", body.email);
    return rawPost(path).send(body);
  },
});

describe("POST /providers/:slug/enquiries", () => {
  it("stores a general enquiry and emails provider, owner and enquirer", async () => {
    const owner = await createUser({ role: "PROVIDER" });
    const provider = await makeProvider({ owner: owner._id });
    const r = await post(`/providers/${provider.slug}/enquiries`).send(general);
    expect(r.status).toBe(201);
    expect(r.body.data).toEqual({ received: true });

    const saved = await Enquiry.findOne({ provider: provider._id }).lean();
    expect(saved).toMatchObject({ type: "general", email: "ann@example.com", phone: "+44 7700 900123", service: "Fuel", status: "new" });
    expect(saved?.user).toBeUndefined();

    await new Promise((r) => setTimeout(r, 20));
    const to = testOutbox.map((m) => m.to).sort();
    expect(to).toEqual([owner.email, provider.contact!.email, "ann@example.com"].sort());
    const lead = testOutbox.find((m) => m.to === provider.contact!.email)!;
    expect(lead.replyTo).toBe("ann@example.com");
    expect(lead.text).toContain("Need a fuel quote");
    const confirmation = testOutbox.find((m) => m.to === "ann@example.com")!;
    expect(confirmation.text).not.toContain("Need a fuel quote");
  });

  it("emails a shared provider/owner address only once and links the signed-in user", async () => {
    const { agent, user } = await signedInAgent("USER", app);
    const provider = await makeProvider({ owner: user._id, contactEmail: user.email.toUpperCase() });
    await proveEmail("enquiry_email", general.email);
    expect((await agent.post(`/api/v1/providers/${provider.slug}/enquiries`).send(general)).status).toBe(201);
    await new Promise((r) => setTimeout(r, 20));
    expect(testOutbox.filter((m) => m.to.toLowerCase() === user.email)).toHaveLength(1);
    const saved = await Enquiry.findOne({ provider: provider._id }).lean();
    expect(String(saved?.user)).toBe(user.id);
  });

  it("accepts 'Other' and matches services case-insensitively, rejecting unknown services", async () => {
    const provider = await makeProvider();
    expect((await post(`/providers/${provider.slug}/enquiries`).send({ ...general, service: "Other" })).status).toBe(201);
    expect((await post(`/providers/${provider.slug}/enquiries`).send({ ...general, service: "fuel" })).status).toBe(201);
    const bad = await post(`/providers/${provider.slug}/enquiries`).send({ ...general, service: "Catering" });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fieldErrors).toHaveProperty("service");
    const services = (await Enquiry.find({ provider: provider._id }).lean()).map((e) => e.service).sort();
    expect(services).toEqual(["Fuel", "Other"]);
  });

  it("validates input with field errors matching the UI", async () => {
    const provider = await makeProvider();
    const r = await post(`/providers/${provider.slug}/enquiries`).send({ name: "A", email: "nope", phone: "abc", service: "", message: "short" });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors).sort()).toEqual(["email", "message", "name", "phone", "service"]);
    const long = await post(`/providers/${provider.slug}/enquiries`).send({ ...general, message: "x".repeat(5001) });
    expect(long.status).toBe(422);
  });

  it("only accepts enquiries for published pro/ultra_pro providers", async () => {
    const basic = await makeProvider({ tier: "basic" });
    const r = await post(`/providers/${basic.slug}/enquiries`).send(general);
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe("This provider doesn't accept enquiries");
    const ultra = await makeProvider({ tier: "ultra_pro" });
    expect((await post(`/providers/${ultra.slug}/enquiries`).send(general)).status).toBe(201);
    const draft = await makeProvider({ status: "draft" });
    expect((await post(`/providers/${draft.slug}/enquiries`).send(general)).status).toBe(404);
    expect((await post(`/providers/missing-co/enquiries`).send(general)).status).toBe(404);
  });

  it("silently drops honeypot submissions", async () => {
    const provider = await makeProvider();
    const r = await post(`/providers/${provider.slug}/enquiries`).send({ ...general, website: "http://spam.example" });
    expect(r.status).toBe(201);
    expect(r.body.data).toEqual({ received: true });
    expect(await Enquiry.countDocuments()).toBe(0);
    await new Promise((r) => setTimeout(r, 20));
    expect(testOutbox).toHaveLength(0);
  });

  it("accepts the API fleet shape with an optional message", async () => {
    const provider = await makeProvider();
    const aircraftId = String(provider.fleet[0]!._id);
    const body = {
      type: "fleet",
      name: "Sam Pilot",
      email: "sam@example.com",
      trip: { tripType: "round-trip", from: "OMDB", to: "LFMN", departAt: `${FUTURE_DAY}T08:00`, passengers: 4, aircraftId },
    };
    expect((await post(`/providers/${provider.slug}/enquiries`).send(body)).status).toBe(201);
    const saved = await Enquiry.findOne({ provider: provider._id }).lean();
    expect(saved).toMatchObject({ type: "fleet", message: "", service: "Aircraft charter", trip: { tripType: "round-trip", aircraft: "Gulfstream G650", passengers: 4 } });

    const bad = await post(`/providers/${provider.slug}/enquiries`).send({ ...body, trip: { ...body.trip, passengers: 0, from: "X" } });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors).sort()).toEqual(["trip.from", "trip.passengers"]);
  });
});

describe("POST /enquiries (frontend form endpoint)", () => {
  it("accepts a general enquiry with providerSlug in the body", async () => {
    const provider = await makeProvider();
    const r = await post("/enquiries").send({ ...general, providerSlug: provider.slug });
    expect(r.status).toBe(201);
    expect(await Enquiry.countDocuments({ provider: provider._id })).toBe(1);
  });

  it("accepts the UI's flat fleet form", async () => {
    const provider = await makeProvider();
    const r = await post("/enquiries").send(uiFleet(provider.slug, String(provider.fleet[0]!._id)));
    expect(r.status).toBe(201);
    const saved = await Enquiry.findOne({ provider: provider._id }).lean();
    expect(saved).toMatchObject({
      type: "fleet",
      company: "Acme Corp",
      phone: "+971 50 123 4567",
      trip: { tripType: "one-way", from: "OMDB", to: "EGLL", departAt: `${FUTURE_DAY}T09:30`, passengers: 6, aircraft: "Gulfstream G650" },
    });
  });

  it("rejects an aircraft that isn't in the provider's fleet", async () => {
    const provider = await makeProvider();
    const r = await post("/enquiries").send(uiFleet(provider.slug, "0123456789abcdef01234567"));
    expect(r.status).toBe(422);
    expect(r.body.error.fieldErrors).toHaveProperty("aircraftId");
  });

  it("reports providerSlug and form errors together", async () => {
    const r = await post("/enquiries").send({ ...general, name: "" });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors).sort()).toEqual(["name", "providerSlug"]);
    const fleet = await post("/enquiries").send({ ...uiFleet("x", "y"), date: "soon" });
    expect(fleet.body.error.fieldErrors).toHaveProperty("date");
  });
});

async function seedEnquiries() {
  const { agent: ownerAgent, user: owner } = await signedInAgent("PROVIDER", app);
  const { agent: otherAgent, user: other } = await signedInAgent("PROVIDER", app);
  const mine = await makeProvider({ owner: owner._id });
  const theirs = await makeProvider({ owner: other._id });
  await post(`/providers/${mine.slug}/enquiries`).send(general);
  // One listing per provider account: both of the owner's enquiries go to the same listing.
  await post(`/providers/${mine.slug}/enquiries`).send({ ...general, name: "Bob Jet", email: "bob@example.com" });
  await post(`/providers/${theirs.slug}/enquiries`).send({ ...general, name: "Cat Wing", email: "cat@example.com" });
  return { ownerAgent, otherAgent, mine, theirs };
}

describe("provider inbox /me/enquiries", () => {
  it("lists only enquiries for listings the provider owns", async () => {
    const { ownerAgent, otherAgent } = await seedEnquiries();
    const r = await ownerAgent.get("/api/v1/me/enquiries");
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(2);
    expect(r.body.data.items.map((i: { name: string }) => i.name).sort()).toEqual(["Ann Lee", "Bob Jet"]);
    expect(r.body.data.items[0]).toHaveProperty("email");
    const theirs = await otherAgent.get("/api/v1/me/enquiries");
    expect(theirs.body.data.items.map((i: { name: string }) => i.name)).toEqual(["Cat Wing"]);
    expect((await ownerAgent.get("/api/v1/me/enquiries?pageSize=1")).body.data).toMatchObject({ total: 2, totalPages: 2 });
  });

  it("auto-marks new enquiries read on open and supports status updates and filters", async () => {
    const { ownerAgent, otherAgent } = await seedEnquiries();
    const list = await ownerAgent.get("/api/v1/me/enquiries?status=new");
    const id = list.body.data.items[0].id as string;

    // Another provider can't read or update it.
    expect((await otherAgent.get(`/api/v1/me/enquiries/${id}`)).status).toBe(404);
    expect((await otherAgent.patch(`/api/v1/me/enquiries/${id}`).send({ status: "spam" })).status).toBe(404);
    expect((await Enquiry.findById(id).lean())?.status).toBe("new");

    const opened = await ownerAgent.get(`/api/v1/me/enquiries/${id}`);
    expect(opened.body.data.status).toBe("read");
    expect((await ownerAgent.get("/api/v1/me/enquiries?status=new")).body.data.total).toBe(1);

    const replied = await ownerAgent.patch(`/api/v1/me/enquiries/${id}`).send({ status: "replied" });
    expect(replied.body.data.status).toBe("replied");
    // Opening again doesn't revert the status.
    expect((await ownerAgent.get(`/api/v1/me/enquiries/${id}`)).body.data.status).toBe("replied");
    expect((await ownerAgent.patch(`/api/v1/me/enquiries/${id}`).send({ status: "new" })).status).toBe(422);
    expect((await ownerAgent.get("/api/v1/me/enquiries/nope")).status).toBe(422);
  });

  it("returns an empty inbox for providers without listings", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    expect((await agent.get("/api/v1/me/enquiries")).body.data).toMatchObject({ items: [], total: 0 });
  });

  it("requires the enquiries:read:own permission", async () => {
    expect((await request(app).get("/api/v1/me/enquiries")).status).toBe(401);
    const { agent } = await signedInAgent("USER", app);
    expect((await agent.get("/api/v1/me/enquiries")).status).toBe(403);
  });
});

describe("admin enquiries", () => {
  it("is staff-only", async () => {
    expect((await request(app).get("/api/v1/admin/enquiries")).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get("/api/v1/admin/enquiries")).status).toBe(401);
    }
  });

  it("lists with filters, reads and updates any enquiry", async () => {
    const { mine, theirs } = await seedEnquiries();
    const { agent } = await signedInAgent("MANAGER", app);
    const all = await agent.get("/api/v1/admin/enquiries");
    expect(all.body.data.total).toBe(3);
    expect(all.body.data.items[0]).toHaveProperty("userId");

    expect((await agent.get(`/api/v1/admin/enquiries?provider=${mine.slug}`)).body.data.total).toBe(2);
    expect((await agent.get(`/api/v1/admin/enquiries?provider=${String(theirs._id)}`)).body.data.items[0].name).toBe("Cat Wing");
    expect((await agent.get("/api/v1/admin/enquiries?q=bob@")).body.data.total).toBe(1);
    expect((await agent.get("/api/v1/admin/enquiries?q=.*")).body.data.total).toBe(0);
    expect((await agent.get("/api/v1/admin/enquiries?from=2000-01-01&to=2001-01-01")).body.data.total).toBe(0);
    const today = new Date().toISOString().slice(0, 10);
    expect((await agent.get(`/api/v1/admin/enquiries?to=${today}`)).body.data.total).toBe(3);
    expect((await agent.get(`/api/v1/admin/enquiries?from=${new Date(Date.now() - 60_000).toISOString()}`)).body.data.total).toBe(3);
    expect((await agent.get("/api/v1/admin/enquiries?from=2026-02-01&to=2026-01-01")).status).toBe(422);
    expect((await agent.get("/api/v1/admin/enquiries?from=not-a-date")).status).toBe(422);

    const id = all.body.data.items[0].id as string;
    const one = await agent.get(`/api/v1/admin/enquiries/${id}`);
    expect(one.body.data.status).toBe("new"); // staff viewing doesn't mark read
    const upd = await agent.patch(`/api/v1/admin/enquiries/${id}`).send({ status: "spam" });
    expect(upd.body.data.status).toBe("spam");
    expect((await agent.get("/api/v1/admin/enquiries?status=spam")).body.data.total).toBe(1);
    expect((await agent.get("/api/v1/admin/enquiries/0123456789abcdef01234567")).status).toBe(404);
    expect((await agent.patch(`/api/v1/admin/enquiries/${id}`).send({ status: "bogus" })).status).toBe(422);
  });
});

describe("enquiry email rules", () => {
  it("needs the email verified with a one-time code before an enquiry is accepted", async () => {
    const provider = await makeProvider();
    const path = `/providers/${provider.slug}/enquiries`;
    const email = general.email.toLowerCase();

    const blocked = await rawPost(path).send(general);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(await Enquiry.countDocuments()).toBe(0);

    expect((await rawPost("/enquiries/email-otp").send({ email })).status).toBe(200);
    const code = lastCodeFor(email);
    expect(code).toHaveLength(4);
    expect((await rawPost("/enquiries/email-otp/verify").send({ email, code: code === "0000" ? "1111" : "0000" })).status).toBe(400);
    expect((await rawPost(path).send(general)).body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect((await rawPost("/enquiries/email-otp/verify").send({ email, code })).status).toBe(200);

    expect((await rawPost(path).send(general)).status).toBe(201);
    // The proof is single-use: a second enquiry needs a new code.
    expect((await rawPost(path).send(general)).body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it("skips the code for a signed-in user enquiring from their own verified email", async () => {
    const provider = await makeProvider();
    const path = `/api/v1/providers/${provider.slug}/enquiries`;
    const { agent, user } = await signedInAgent("USER", app);
    expect((await agent.post(path).send({ ...general, email: user.email })).status).toBe(201);
    // …but not when they enquire from a different address.
    expect((await agent.post(path).send({ ...general, email: "colleague@example.com" })).body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects personal email addresses and never sends them a code", async () => {
    const provider = await makeProvider();
    for (const email of ["ann@gmail.com", "ann@yahoo.co.in", "ann@outlook.com", "ann@mailinator.com"]) {
      const r = await rawPost(`/providers/${provider.slug}/enquiries`).send({ ...general, email });
      expect(r.status, email).toBe(422);
      expect(r.body.error.fieldErrors.email, email).toMatch(/work email/i);
      const flat = await rawPost("/enquiries").send({ ...uiFleet(provider.slug, String(provider.fleet[0]!._id)), email });
      expect(flat.status, email).toBe(422);
      const otp = await rawPost("/enquiries/email-otp").send({ email });
      expect(otp.status, email).toBe(422);
      expect(testOutbox.filter((m) => m.to === email)).toHaveLength(0);
    }
    expect(await Enquiry.countDocuments()).toBe(0);
  });
});

describe("departure dates", () => {
  it("rejects a departure day that has already passed, on both fleet enquiry shapes", async () => {
    const provider = await makeProvider();
    const aircraftId = String(provider.fleet[0]!._id);

    const flat = await post("/enquiries").send({ ...uiFleet(provider.slug, aircraftId), date: PAST_DAY });
    expect(flat.status).toBe(422);
    expect(flat.body.error.fieldErrors.date).toMatch(/in the past/i);

    const api = await post(`/providers/${provider.slug}/enquiries`).send({
      type: "fleet",
      name: "Sam Pilot",
      email: "sam@example.com",
      trip: { tripType: "one-way", from: "OMDB", to: "EGLL", departAt: `${PAST_DAY}T09:30`, passengers: 2, aircraftId },
    });
    expect(api.status).toBe(422);
    expect(await Enquiry.countDocuments()).toBe(0);

    // Today is fine.
    const today = new Date().toISOString().slice(0, 10);
    expect((await post("/enquiries").send({ ...uiFleet(provider.slug, aircraftId), date: today })).status).toBe(201);
  });
});
