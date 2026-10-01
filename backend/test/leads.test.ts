import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { isBusinessEmail } from "../src/lib/business-email.js";
import { csvCell } from "../src/modules/leads/csv.js";
import { Lead } from "../src/modules/leads/lead.model.js";
import { adminLeadsRouter, advertisingRouter, contactRouter, dataLicenceRouter, demoRequestsRouter } from "../src/modules/leads/leads.routes.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { appWith, createUser, lastCodeFor, ORIGIN, proveEmail, signedInAgent } from "./helpers.js";

const app = appWith(
  ["/contact", contactRouter],
  ["/demo-requests", demoRequestsRouter],
  ["/data-licence", dataLicenceRouter],
  ["/advertising", advertisingRouter],
  ["/admin/leads", adminLeadsRouter],
);
const post = (path: string, body: object) => request(app).post(`/api/v1${path}`).set("Origin", ORIGIN).send(body);
const admin = (p = "") => `/api/v1/admin/leads${p}`;

/** Exactly what website/src/components/contact/ContactForm.tsx sends. */
const contactPayload = (email: string) => ({ name: "Amelia Hart", email, phone: "+44 7700 900123", subject: "Sales", message: "We'd like to list our FBO network." });
/** Exactly what DemoRequestForm.tsx sends (blank optionals as ""). */
const demoPayload = (email: string) => ({
  firstName: "Jonas",
  lastName: "Berg",
  email,
  company: "Nordic Jets",
  role: "",
  phone: "",
  interest: "Advertising",
  preferredDate: "",
  message: "",
});
const dataLicencePayload = { name: "Dana Lee", email: "dana@data.example", company: "FlightData Co", datasets: ["airports", "providers"], useCase: "Enrich our trip planning tool with FBO data." };
const advertisingPayload = { name: "Sam Ortiz", email: "sam@ads.example", company: "Jet Fuel Inc", phone: "", placement: "header-banner", message: "" };

async function verifyEmail(form: "/contact" | "/demo-requests" | "/data-licence" | "/advertising", email: string) {
  expect((await post(`${form}/email-otp`, { email })).status).toBe(200);
  const code = lastCodeFor(email);
  expect(code).toHaveLength(form === "/demo-requests" ? 6 : 4);
  const r = await post(`${form}/email-otp/verify`, { email, code });
  expect(r.status).toBe(200);
  expect(r.body.data).toEqual({ verified: true });
}

const mailsTo = (to: string) => testOutbox.filter((m) => m.to === to);

describe("contact form", () => {
  it("requires a verified email, stores the lead and notifies staff + submitter", async () => {
    const adminUser = await createUser({ role: "ADMIN" });
    const manager = await createUser({ role: "MANAGER" });
    const plainUser = await createUser({ role: "USER" });
    const email = "amelia@example.com";

    const blocked = await post("/contact", contactPayload(email));
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    await verifyEmail("/contact", email);
    const r = await post("/contact", contactPayload(email));
    expect(r.status).toBe(201);
    expect(r.body.data).toEqual({ received: true });

    const lead = await Lead.findOne({ email });
    expect(lead).toMatchObject({ type: "contact", status: "new", name: "Amelia Hart", phone: "+44 7700 900123" });
    expect(lead?.details?.subject).toBe("Sales");

    await vi.waitFor(() => {
      expect(mailsTo(adminUser.email)).toHaveLength(1);
      expect(mailsTo(manager.email)).toHaveLength(1);
    });
    expect(mailsTo(adminUser.email)[0]).toMatchObject({ replyTo: email });
    expect(mailsTo(adminUser.email)[0]!.text).toContain("We'd like to list our FBO network.");
    expect(mailsTo(plainUser.email)).toHaveLength(0);
    expect(mailsTo(email).some((m) => m.subject === "We've received your message")).toBe(true);

    // The verification proof is single-use.
    expect((await post("/contact", contactPayload(email))).status).toBe(400);
  });

  it("rejects wrong and malformed codes", async () => {
    const email = "wrong@example.com";
    await post("/contact/email-otp", { email });
    const code = lastCodeFor(email);
    const wrong = code === "0000" ? "1111" : "0000";
    const r = await post("/contact/email-otp/verify", { email, code: wrong });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_OTP");
    expect((await post("/contact/email-otp/verify", { email, code: "123456" })).status).toBe(422);
    expect((await post("/contact/email-otp", { email: "not-an-email" })).status).toBe(422);
  });

  it("does not accept a demo verification for the contact form", async () => {
    const email = "cross@example.com";
    await verifyEmail("/demo-requests", email);
    expect((await post("/contact", contactPayload(email))).status).toBe(400);
  });

  it("validates fields like the frontend schema", async () => {
    const r = await post("/contact", { name: "A", email: "x", phone: "call me", subject: "", message: "short" });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors)).toEqual(expect.arrayContaining(["name", "email", "phone", "subject", "message"]));
  });

  it("silently drops honeypot submissions", async () => {
    const r = await post("/contact", { ...contactPayload("bot@example.com"), website: "http://spam.example" });
    expect(r.status).toBe(201);
    expect(r.body.data).toEqual({ received: true });
    expect(await Lead.countDocuments()).toBe(0);
    expect(testOutbox).toHaveLength(0);
  });
});

describe("demo requests", () => {
  it("uses a 6-digit code and stores type-specific details", async () => {
    const email = "jonas@nordicjets.example";
    expect((await post("/demo-requests", demoPayload(email))).status).toBe(400);
    await verifyEmail("/demo-requests", email);
    expect((await post("/demo-requests/email-otp/verify", { email, code: "1234" })).status).toBe(422);
    const r = await post("/demo-requests", demoPayload(email));
    expect(r.status).toBe(201);
    const lead = await Lead.findOne({ type: "demo" }).lean();
    expect(lead).toMatchObject({ name: "Jonas Berg", company: "Nordic Jets", details: { firstName: "Jonas", lastName: "Berg", interest: "Advertising" } });
    expect(lead?.phone).toBeUndefined();
    expect(lead?.details?.role).toBeUndefined();
  });

  it("rejects a preferred date in the past (blank and upcoming dates are fine)", async () => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const r = await post("/demo-requests", { ...demoPayload("x@example.com"), preferredDate: past });
    expect(r.status).toBe(422);
    expect(r.body.error.fieldErrors.preferredDate).toMatch(/today or a later date/i);

    const future = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    await proveEmail("demo_email", "x@example.com");
    expect((await post("/demo-requests", { ...demoPayload("x@example.com"), preferredDate: future })).status).toBe(201);
  });

  it("requires company and interest", async () => {
    const r = await post("/demo-requests", { ...demoPayload("x@example.com"), company: "", interest: "" });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors)).toEqual(expect.arrayContaining(["company", "interest"]));
  });
});

describe("data licence and advertising", () => {
  it("accepts data-licence requests only after the email is verified", async () => {
    const blocked = await post("/data-licence/requests", dataLicencePayload);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(await Lead.countDocuments()).toBe(0);

    await verifyEmail("/data-licence", dataLicencePayload.email);
    const r = await post("/data-licence/requests", dataLicencePayload);
    expect(r.status).toBe(201);
    // The proof is single-use.
    expect((await post("/data-licence/requests", dataLicencePayload)).body.error.code).toBe("EMAIL_NOT_VERIFIED");
    const lead = await Lead.findOne({ type: "data_licence" }).lean();
    expect(lead?.details?.datasets).toEqual(["airports", "providers"]);
    expect(lead?.message).toBe(dataLicencePayload.useCase);
    // The verification code, then the confirmation.
    await vi.waitFor(() => expect(mailsTo(dataLicencePayload.email)).toHaveLength(2));
  });

  it("validates datasets", async () => {
    const r = await post("/data-licence/requests", { ...dataLicencePayload, datasets: [] });
    expect(r.status).toBe(422);
    expect(r.body.error.fieldErrors).toHaveProperty("datasets");
  });

  it("accepts advertising enquiries only after the email is verified", async () => {
    expect((await post("/advertising/enquiries", advertisingPayload)).body.error.code).toBe("EMAIL_NOT_VERIFIED");
    // A code verified for another form doesn't count.
    await proveEmail("contact_email", advertisingPayload.email);
    expect((await post("/advertising/enquiries", advertisingPayload)).body.error.code).toBe("EMAIL_NOT_VERIFIED");

    await verifyEmail("/advertising", advertisingPayload.email);
    expect((await post("/advertising/enquiries", advertisingPayload)).status).toBe(201);
    const lead = await Lead.findOne({ type: "advertising" }).lean();
    expect(lead?.details?.placement).toBe("header-banner");
    expect((await post("/advertising/enquiries", { ...advertisingPayload, placement: "" })).status).toBe(422);
  });
});

describe("admin leads", () => {
  async function seedLeads() {
    await Lead.create([
      { type: "contact", name: "Old Contact", email: "old@example.com", message: "old", createdAt: new Date("2026-01-10T10:00:00Z") },
      { type: "advertising", name: "Ad Buyer", email: "buyer@example.com", company: "=HYPERLINK(\"http://x\")", details: { placement: "sidebar" }, createdAt: new Date("2026-03-05T10:00:00Z") },
      { type: "data_licence", name: "Data, \"Person\"", email: "data@example.com", message: "line1\nline2", details: { datasets: ["airports"] }, status: "closed" },
    ]);
  }

  it("requires leads permissions", async () => {
    expect((await request(app).get(admin())).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(admin())).status).toBe(401);
      expect((await agent.get(admin("/export.csv"))).status).toBe(401);
    }
  });

  it("lists with filters, search, date range and pagination", async () => {
    await seedLeads();
    const { agent } = await signedInAgent("MANAGER", app);
    const all = await agent.get(admin());
    expect(all.body.data.total).toBe(3);
    expect(all.body.data.items[0].type).toBe("data_licence");

    expect((await agent.get(admin("?type=advertising"))).body.data.total).toBe(1);
    expect((await agent.get(admin("?status=closed"))).body.data.total).toBe(1);
    expect((await agent.get(admin("?q=buyer@"))).body.data.total).toBe(1);
    expect((await agent.get(admin("?from=2026-01-01&to=2026-01-10"))).body.data.total).toBe(1);
    expect((await agent.get(admin("?from=2026-03-01T00:00:00Z&to=2026-03-31"))).body.data.total).toBe(1);
    const page = await agent.get(admin("?pageSize=2&page=2"));
    expect(page.body.data).toMatchObject({ total: 3, page: 2, totalPages: 2 });
    expect(page.body.data.items).toHaveLength(1);

    const bad = await agent.get(admin("?type=spam&from=yesterday"));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["type", "from"]));
  });

  it("updates status, assigns to staff only and adds notes", async () => {
    await seedLeads();
    const { agent, user: manager } = await signedInAgent("MANAGER", app);
    const lead = await Lead.findOne({ type: "contact" });
    const id = lead!.id;

    const upd = await agent.patch(admin(`/${id}`)).send({ status: "in_progress", assignedTo: manager.id });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ status: "in_progress", assignedTo: { id: manager.id, email: manager.email } });

    const regular = await createUser({ role: "USER" });
    const notStaff = await agent.patch(admin(`/${id}`)).send({ assignedTo: regular.id });
    expect(notStaff.status).toBe(422);
    expect(notStaff.body.error.fieldErrors).toHaveProperty("assignedTo");

    expect((await agent.patch(admin(`/${id}`)).send({ assignedTo: null })).body.data.assignedTo).toBeNull();
    expect((await agent.patch(admin(`/${id}`)).send({ status: "won" })).status).toBe(422);
    expect((await agent.patch(admin(`/${id}`)).send({})).status).toBe(422);

    const note = await agent.post(admin(`/${id}/notes`)).send({ text: "Called back, sending pricing." });
    expect(note.status).toBe(201);
    expect(note.body.data.notes).toHaveLength(1);
    expect(note.body.data.notes[0]).toMatchObject({ text: "Called back, sending pricing.", by: { id: manager.id } });
    expect((await agent.post(admin(`/${id}/notes`)).send({ text: "" })).status).toBe(422);

    const one = await agent.get(admin(`/${id}`));
    expect(one.body.data.notesCount).toBe(1);

    expect((await agent.get(admin("/64b7f0000000000000000000"))).status).toBe(404);
    expect((await agent.patch(admin("/64b7f0000000000000000000")).send({ status: "closed" })).status).toBe(404);
    expect((await agent.post(admin("/64b7f0000000000000000000/notes")).send({ text: "x" })).status).toBe(404);
    expect((await agent.get(admin("/nope"))).status).toBe(422);
  });

  it("exports CSV with escaping and formula-injection protection", async () => {
    await seedLeads();
    const { agent } = await signedInAgent("ADMIN", app);
    const r = await agent.get(admin("/export.csv")).buffer(true).parse((res, cb) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => (data += c));
      res.on("end", () => cb(null, data));
    });
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/^text\/csv/);
    expect(r.headers["content-disposition"]).toMatch(/attachment; filename="leads-all-/);
    const csv = r.body as string;
    const lines = csv.replace(new RegExp("^\\uFEFF"), "").split("\r\n");
    expect(lines[0]).toBe("id,createdAt,type,status,name,email,phone,company,message,details,assignedTo,notes");
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain(`"Data, ""Person"""`);
    expect(csv).toContain(`"line1\nline2"`);
    expect(lines.filter(Boolean)).toHaveLength(4);

    const filtered = await agent.get(admin("/export.csv?type=advertising")).buffer(true).parse((res, cb) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => (data += c));
      res.on("end", () => cb(null, data));
    });
    expect((filtered.body as string).split("\r\n").filter(Boolean)).toHaveLength(2);
    expect((await agent.get(admin("/export.csv?type=bogus"))).status).toBe(422);
  });

  it("csvCell neutralises every formula prefix", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+91 555")).toBe("'+91 555");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
  });
});

describe("business email only", () => {
  it("recognises personal and disposable mailbox domains", () => {
    for (const personal of ["a@gmail.com", "A@GMAIL.COM", "a@googlemail.com", "a@yahoo.com", "a@yahoo.co.in", "a@hotmail.fr", "a@outlook.com", "a@live.co.uk", "a@icloud.com", "a@proton.me", "a@rediffmail.com", "a@mailinator.com", "a@qq.com"]) {
      expect(isBusinessEmail(personal), personal).toBe(false);
    }
    for (const work of ["ops@execujet.com", "sales@jet-fuel.aero", "a@company.co.in", "a@gmail-partners.com", "a@yahoo-aviation.com", "parveen@marioxsoftware.com"]) {
      expect(isBusinessEmail(work), work).toBe(true);
    }
    expect(isBusinessEmail("not-an-email")).toBe(false);
  });

  it("rejects personal addresses on every lead form and never sends them a code", async () => {
    const personal = "someone@gmail.com";
    const submissions: Array<[string, object]> = [
      ["/contact", contactPayload(personal)],
      ["/demo-requests", demoPayload(personal)],
      ["/data-licence/requests", { ...dataLicencePayload, email: personal }],
      ["/advertising/enquiries", { ...advertisingPayload, email: personal }],
    ];
    for (const [path, body] of submissions) {
      const r = await post(path, body);
      expect(r.status, path).toBe(422);
      expect(r.body.error.fieldErrors.email, path).toMatch(/work email/i);
    }
    for (const form of ["/contact", "/demo-requests", "/data-licence", "/advertising"]) {
      const r = await post(`${form}/email-otp`, { email: personal });
      expect(r.status, form).toBe(422);
      expect(r.body.error.fieldErrors.email, form).toMatch(/work email/i);
    }
    expect(mailsTo(personal)).toHaveLength(0);
    expect(await Lead.countDocuments()).toBe(0);
  });
});
