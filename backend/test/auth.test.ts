import request from "supertest";
import { describe, expect, it } from "vitest";
import { RefreshToken } from "../src/modules/auth/refresh-token.model.js";
import { Otp } from "../src/modules/otp/otp.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, cookieValue, createUser, lastCodeFor, ORIGIN, PASSWORD } from "./helpers.js";

const api = (path: string) => `/api/v1${path}`;
const reg = { firstName: "James", lastName: "Henderson", email: "captain@airline.com", password: "Flight1234" };

describe("registration & email verification", () => {
  it("registers, emails a code, verifies and signs the user in", async () => {
    const r = await request(app).post(api("/auth/register")).set("Origin", ORIGIN).send(reg);
    expect(r.status).toBe(201);
    expect(r.body.data).toEqual({ email: "captain@airline.com" });

    const user = await User.findOne({ email: reg.email }).select("+passwordHash");
    expect(user?.emailVerifiedAt).toBeUndefined();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user?.role).toBe("USER");

    // Codes are stored hashed, never in plain text.
    const otp = await Otp.findOne({ email: reg.email });
    const code = lastCodeFor(reg.email);
    expect(otp?.codeHash).not.toContain(code);

    const v = await request(app).post(api("/auth/verify-email")).set("Origin", ORIGIN).send({ email: reg.email, code });
    expect(v.status).toBe(200);
    expect(v.body.data).toMatchObject({ email: reg.email, role: "USER", emailVerified: true });
    expect(v.body.data.passwordHash).toBeUndefined();
    expect(cookieValue(v.headers["set-cookie"], "ga_at")).toBeTruthy();
    expect(cookieValue(v.headers["set-cookie"], "ga_rt")).toBeTruthy();
    expect(String(v.headers["set-cookie"])).toMatch(/HttpOnly/);
  });

  it("gives provider accounts the PROVIDER role", async () => {
    await request(app).post(api("/auth/register")).send({ ...reg, accountType: "provider", company: "Jet Co", plan: "pro" });
    const user = await User.findOne({ email: reg.email });
    expect(user?.role).toBe("PROVIDER");
    expect(user?.intendedPlan).toBe("pro");
  });

  it("never lets a client choose an elevated role", async () => {
    await request(app).post(api("/auth/register")).send({ ...reg, role: "ADMIN" });
    expect((await User.findOne({ email: reg.email }))?.role).toBe("USER");
  });

  it("rejects invalid input with field errors", async () => {
    const r = await request(app).post(api("/auth/register")).send({ ...reg, email: "nope", password: "short" });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("VALIDATION_ERROR");
    expect(r.body.error.fieldErrors).toHaveProperty("email");
    expect(r.body.error.fieldErrors).toHaveProperty("password");
  });

  it("rejects a duplicate verified email", async () => {
    await createUser({ email: reg.email });
    const r = await request(app).post(api("/auth/register")).send(reg);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects wrong codes and locks after too many attempts", async () => {
    await request(app).post(api("/auth/register")).send(reg);
    const bad = await request(app).post(api("/auth/verify-email")).send({ email: reg.email, code: "000000" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_OTP");
    for (let i = 0; i < 4; i++) await request(app).post(api("/auth/verify-email")).send({ email: reg.email, code: "000000" });
    const locked = await request(app).post(api("/auth/verify-email")).send({ email: reg.email, code: lastCodeFor(reg.email) });
    expect(locked.status).toBe(429);
  });

  it("does not reveal whether an email exists when resending", async () => {
    const r = await request(app).post(api("/auth/resend-verification")).send({ email: "ghost@example.com" });
    expect(r.status).toBe(200);
  });
});

describe("login", () => {
  it("signs in and returns the session user with permissions", async () => {
    const user = await createUser({ role: "PROVIDER" });
    const r = await request(app).post(api("/auth/login")).set("Origin", ORIGIN).send({ email: user.email, password: PASSWORD });
    expect(r.status).toBe(200);
    expect(r.body.data.role).toBe("PROVIDER");
    expect(r.body.data.permissions).toContain("listing:manage:own");
    expect(r.body.data.permissions).not.toContain("users:manage");
  });

  it("uses one generic error for wrong password and unknown email", async () => {
    const user = await createUser();
    const wrong = await request(app).post(api("/auth/login")).send({ email: user.email, password: "Wrong1234" });
    const ghost = await request(app).post(api("/auth/login")).send({ email: "ghost@example.com", password: "Wrong1234" });
    expect(wrong.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(wrong.body.error).toEqual(ghost.body.error);
  });

  it("rejects NoSQL operator injection in credentials", async () => {
    await createUser();
    const r = await request(app).post(api("/auth/login")).send({ email: { $gt: "" }, password: { $ne: null } });
    expect(r.status).toBe(422);
  });

  it("requires a verified email", async () => {
    const user = await createUser({ verified: false });
    const r = await request(app).post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("locks the account after repeated failures", async () => {
    const user = await createUser();
    for (let i = 0; i < 8; i++) await request(app).post(api("/auth/login")).send({ email: user.email, password: "Wrong1234" });
    const r = await request(app).post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("blocks suspended users", async () => {
    const user = await createUser({ status: "suspended" });
    const r = await request(app).post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("session, refresh rotation & logout", () => {
  it("/auth/me requires a session", async () => {
    const r = await request(app).get(api("/auth/me"));
    expect(r.status).toBe(401);
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const user = await createUser();
    const agent = request.agent(app);
    const login = await agent.post(api("/auth/login")).send({ email: user.email, password: PASSWORD, remember: true });
    const firstRefresh = cookieValue(login.headers["set-cookie"], "ga_rt")!;

    const rotated = await agent.post(api("/auth/refresh"));
    expect(rotated.status).toBe(200);
    const secondRefresh = cookieValue(rotated.headers["set-cookie"], "ga_rt")!;
    expect(secondRefresh).not.toBe(firstRefresh);

    // Replaying the first (already rotated) token is treated as theft: the whole family is revoked.
    const replay = await request(app).post(api("/auth/refresh")).set("Cookie", `ga_rt=${firstRefresh}`);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("REFRESH_REUSED");

    const afterTheft = await request(app).post(api("/auth/refresh")).set("Cookie", `ga_rt=${secondRefresh}`);
    expect(afterTheft.status).toBe(401);
    expect(await RefreshToken.countDocuments({ revokedAt: { $exists: false } })).toBe(0);
  });

  it("logout revokes the refresh token", async () => {
    const user = await createUser();
    const agent = request.agent(app);
    const login = await agent.post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    const rt = cookieValue(login.headers["set-cookie"], "ga_rt")!;
    expect((await agent.post(api("/auth/logout"))).status).toBe(204);
    const r = await request(app).post(api("/auth/refresh")).set("Cookie", `ga_rt=${rt}`);
    expect(r.status).toBe(401);
  });

  it("rejects a tampered access token", async () => {
    const r = await request(app).get(api("/auth/me")).set("Authorization", "Bearer abc.def.ghi");
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("INVALID_TOKEN");
  });

  it("blocks cross-site state-changing requests", async () => {
    const r = await request(app).post(api("/auth/logout")).set("Origin", "https://evil.example");
    expect(r.status).toBe(403);
  });
});

describe("password reset & change", () => {
  it("resets the password with an emailed code and signs out other sessions", async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post(api("/auth/login")).send({ email: user.email, password: PASSWORD });

    expect((await request(app).post(api("/auth/forgot-password")).send({ email: user.email })).status).toBe(200);
    const code = lastCodeFor(user.email);
    const reset = await request(app).post(api("/auth/reset-password")).send({ email: user.email, code, password: "NewPass999" });
    expect(reset.status).toBe(200);

    // Old access token is invalidated via tokenVersion; old refresh token revoked.
    expect((await agent.get(api("/auth/me"))).status).toBe(401);
    expect((await agent.post(api("/auth/refresh"))).status).toBe(401);
    expect((await request(app).post(api("/auth/login")).send({ email: user.email, password: "NewPass999" })).status).toBe(200);
    // Codes are single-use.
    const again = await request(app).post(api("/auth/reset-password")).send({ email: user.email, code, password: "Another999" });
    expect(again.status).toBe(400);
  });

  it("forgot-password does not reveal unknown emails", async () => {
    const r = await request(app).post(api("/auth/forgot-password")).send({ email: "ghost@example.com" });
    expect(r.status).toBe(200);
  });

  it("changes the password when the current one is correct", async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    const bad = await agent.post(api("/auth/change-password")).send({ currentPassword: "nope", newPassword: "Changed123" });
    expect(bad.status).toBe(400);
    const good = await agent.post(api("/auth/change-password")).send({ currentPassword: PASSWORD, newPassword: "Changed123" });
    expect(good.status).toBe(200);
    // This device stays signed in with a fresh session.
    expect((await agent.get(api("/auth/me"))).status).toBe(200);
  });

  it("updates the profile but ignores protected fields", async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post(api("/auth/login")).send({ email: user.email, password: PASSWORD });
    const r = await agent.patch(api("/auth/me")).send({ firstName: "Amelia", role: "ADMIN", email: "x@y.z" });
    expect(r.status).toBe(200);
    expect(r.body.data.firstName).toBe("Amelia");
    expect(r.body.data.role).toBe("USER");
    expect(r.body.data.email).toBe(user.email);
  });
});

describe("oauth", () => {
  it("reports unconfigured providers cleanly", async () => {
    const r = await request(app).get(api("/auth/oauth/google"));
    expect(r.status).toBe(503);
  });
  it("rejects unknown providers", async () => {
    const r = await request(app).get(api("/auth/oauth/facebook"));
    expect(r.status).toBe(422);
  });
});
