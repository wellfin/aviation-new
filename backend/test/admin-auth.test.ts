import request from "supertest";
import { describe, expect, it } from "vitest";
import { RefreshToken } from "../src/modules/auth/refresh-token.model.js";
import { app, cookieValue, createUser, PASSWORD } from "./helpers.js";

const api = (path: string) => `/api/v1${path}`;

describe("admin console sign-in (/admin/auth)", () => {
  it("signs staff in with admin-only cookies, never website cookies", async () => {
    for (const role of ["MANAGER", "ADMIN"] as const) {
      const user = await createUser({ role });
      const agent = request.agent(app);
      const login = await agent.post(api("/admin/auth/login")).send({ email: user.email, password: PASSWORD });
      expect(login.status).toBe(200);
      expect(login.body.data.role).toBe(role);
      expect(cookieValue(login.headers["set-cookie"], "ga_admin_at")).toBeTruthy();
      expect(cookieValue(login.headers["set-cookie"], "ga_admin_rt")).toBeTruthy();
      expect(cookieValue(login.headers["set-cookie"], "ga_at")).toBeUndefined();
      expect(cookieValue(login.headers["set-cookie"], "ga_rt")).toBeUndefined();

      expect((await agent.get(api("/admin/auth/me"))).status).toBe(200);
      // The admin session is not a website session.
      expect((await agent.get(api("/auth/me"))).status).toBe(401);
      expect((await agent.get(api("/me/favorites"))).status).toBe(401);
    }
  });

  it("rejects customer accounts with the same message as a wrong password", async () => {
    for (const role of ["USER", "PROVIDER"] as const) {
      const user = await createUser({ role });
      const r = await request(app).post(api("/admin/auth/login")).send({ email: user.email, password: PASSWORD });
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(r.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("rotates and revokes admin refresh tokens independently of the website", async () => {
    const user = await createUser({ role: "ADMIN" });
    const agent = request.agent(app);
    const login = await agent.post(api("/admin/auth/login")).send({ email: user.email, password: PASSWORD, remember: true });
    const rt = cookieValue(login.headers["set-cookie"], "ga_admin_rt")!;
    expect(login.headers["set-cookie"]!.toString()).toContain("Path=/api/v1/admin/auth");

    const rotated = await agent.post(api("/admin/auth/refresh"));
    expect(rotated.status).toBe(200);
    expect(cookieValue(rotated.headers["set-cookie"], "ga_admin_at")).toBeTruthy();

    // An admin refresh token is useless against the website refresh endpoint.
    const rt2 = cookieValue(rotated.headers["set-cookie"], "ga_admin_rt")!;
    const cross = await request(app).post(api("/auth/refresh")).set("Cookie", `ga_rt=${rt2}`);
    expect(cross.status).toBe(401);

    expect((await agent.post(api("/admin/auth/logout"))).status).toBe(204);
    expect((await request(app).post(api("/admin/auth/refresh")).set("Cookie", `ga_admin_rt=${rt}`)).status).toBe(401);
    expect(await RefreshToken.countDocuments({ user: user._id, revokedAt: { $exists: false } })).toBe(0);
  });

  it("does not accept a website token on admin routes or an admin token on website routes", async () => {
    const customer = await createUser({ role: "PROVIDER" });
    const web = await request(app).post(api("/auth/login")).send({ email: customer.email, password: PASSWORD });
    const webAt = cookieValue(web.headers["set-cookie"], "ga_at")!;
    // Even presented as a Bearer token, a website JWT has the wrong audience for the console.
    expect((await request(app).get(api("/admin/auth/me")).set("Authorization", `Bearer ${webAt}`)).status).toBe(401);

    const staff = await createUser({ role: "ADMIN" });
    const adm = await request(app).post(api("/admin/auth/login")).send({ email: staff.email, password: PASSWORD });
    const admAt = cookieValue(adm.headers["set-cookie"], "ga_admin_at")!;
    expect((await request(app).get(api("/auth/me")).set("Authorization", `Bearer ${admAt}`)).status).toBe(401);
    expect((await request(app).get(api("/admin/users")).set("Authorization", `Bearer ${admAt}`)).status).toBe(200);
  });

  it("keeps staff off the website login", async () => {
    const staff = await createUser({ role: "MANAGER" });
    const r = await request(app).post(api("/auth/login")).send({ email: staff.email, password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("STAFF_ACCOUNT");
    expect(r.headers["set-cookie"]).toBeUndefined();
  });

  it("lets a customer and an admin be signed in side by side in one browser", async () => {
    const customer = await createUser({ role: "USER" });
    const staff = await createUser({ role: "ADMIN" });
    const browser = request.agent(app);
    expect((await browser.post(api("/auth/login")).send({ email: customer.email, password: PASSWORD })).status).toBe(200);
    expect((await browser.post(api("/admin/auth/login")).send({ email: staff.email, password: PASSWORD })).status).toBe(200);
    expect((await browser.get(api("/auth/me"))).body.data.email).toBe(customer.email);
    expect((await browser.get(api("/admin/auth/me"))).body.data.email).toBe(staff.email);

    // Signing out of the console leaves the website session alone.
    expect((await browser.post(api("/admin/auth/logout"))).status).toBe(204);
    expect((await browser.get(api("/auth/me"))).status).toBe(200);
    expect((await browser.get(api("/admin/auth/me"))).status).toBe(401);
  });

  it("uploads through the admin scope", async () => {
    const staff = await createUser({ role: "MANAGER" });
    const agent = request.agent(app);
    await agent.post(api("/admin/auth/login")).send({ email: staff.email, password: PASSWORD });
    const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082", "hex");
    const r = await agent.post(api("/admin/uploads")).field("kind", "image").attach("file", PNG, { filename: "x.png", contentType: "image/png" });
    expect(r.status).toBe(201);
    expect((await agent.post(api("/uploads")).field("kind", "image").attach("file", PNG, { filename: "x.png", contentType: "image/png" })).status).toBe(401);
  });
});
