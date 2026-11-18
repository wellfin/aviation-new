import request from "supertest";
import { describe, expect, it } from "vitest";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { app, createUser, lastCodeFor, ORIGIN, PASSWORD } from "./helpers.js";

const post = (path: string, body: object) => request(app).post(`/api/v1/admin/auth${path}`).set("Origin", ORIGIN).send(body);

describe("admin console: forgot password", () => {
  it("emails a code to staff, sets the new password and signs in with it", async () => {
    const staff = await createUser({ role: "MANAGER" });
    expect((await post("/forgot-password", { email: staff.email })).status).toBe(200);
    const code = lastCodeFor(staff.email);

    expect((await post("/reset-password", { email: staff.email, code: "000000", password: "NewRunway2026" })).status).toBeGreaterThanOrEqual(400);
    expect((await post("/reset-password", { email: staff.email, code, password: "NewRunway2026" })).status).toBe(200);

    expect((await post("/login", { email: staff.email, password: PASSWORD })).status).toBe(401);
    expect((await post("/login", { email: staff.email, password: "NewRunway2026" })).status).toBe(200);
  });

  it("sends nothing to website accounts or unknown emails, with the same answer", async () => {
    const user = await createUser({ role: "USER" });
    const before = testOutbox.length;
    const a = await post("/forgot-password", { email: user.email });
    const b = await post("/forgot-password", { email: "nobody@jetco.aero" });
    expect(a.status).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(testOutbox.length).toBe(before);
  });
});
