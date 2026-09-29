import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createUser, PASSWORD, signedInAgent } from "./helpers.js";

const api = (p: string) => `/api/v1/admin/users${p}`;

describe("admin user management", () => {
  it("requires authentication", async () => {
    expect((await request(app).get(api(""))).status).toBe(401);
  });

  it("forbids regular users and providers", async () => {
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role);
      expect((await agent.get(api(""))).status).toBe(401);
    }
  });

  it("lets managers read but not modify users", async () => {
    const { agent } = await signedInAgent("MANAGER");
    const target = await createUser();
    expect((await agent.get(api(""))).status).toBe(200);
    expect((await agent.patch(api(`/${target.id}`)).send({ role: "ADMIN" })).status).toBe(403);
  });

  it("lists with search, filters and pagination without leaking secrets", async () => {
    const { agent } = await signedInAgent("ADMIN");
    await createUser({ email: "pilot.one@example.com" });
    await createUser({ email: "ops@jetco.com", role: "PROVIDER" });
    const r = await agent.get(api("?role=PROVIDER&pageSize=5"));
    expect(r.status).toBe(200);
    expect(r.body.data.items.every((u: { role: string }) => u.role === "PROVIDER")).toBe(true);
    expect(r.body.data.pageSize).toBe(5);
    const s = await agent.get(api("?q=pilot.one"));
    expect(s.body.data.items).toHaveLength(1);
    expect(JSON.stringify(s.body)).not.toMatch(/passwordHash|argon2/);
    // regex metacharacters are treated literally
    expect((await agent.get(api("?q=(.*"))).status).toBe(200);
  });

  it("changes a role and forces the user's sessions to re-authenticate", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    const target = await createUser();
    const targetAgent = request.agent(app);
    await targetAgent.post("/api/v1/auth/login").send({ email: target.email, password: PASSWORD });
    expect((await targetAgent.get("/api/v1/auth/me")).status).toBe(200);

    const r = await admin.patch(api(`/${target.id}`)).send({ role: "MANAGER" });
    expect(r.status).toBe(200);
    expect(r.body.data.role).toBe("MANAGER");
    expect((await targetAgent.get("/api/v1/auth/me")).status).toBe(401);
  });

  it("suspending a user blocks them immediately", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    const target = await createUser();
    expect((await admin.patch(api(`/${target.id}`)).send({ status: "suspended" })).status).toBe(200);
    const login = await request(app).post("/api/v1/auth/login").send({ email: target.email, password: PASSWORD });
    expect(login.status).toBe(403);
  });

  it("prevents admins from demoting or deleting themselves", async () => {
    const { agent, user } = await signedInAgent("ADMIN");
    expect((await agent.patch(api(`/${user.id}`)).send({ role: "USER" })).status).toBe(400);
    expect((await agent.delete(api(`/${user.id}`))).status).toBe(400);
  });

  it("validates ids and bodies, and 404s unknown users", async () => {
    const { agent } = await signedInAgent("ADMIN");
    expect((await agent.get(api("/not-an-id"))).status).toBe(422);
    expect((await agent.get(api("/64b7f0000000000000000000"))).status).toBe(404);
    const target = await createUser();
    expect((await agent.patch(api(`/${target.id}`)).send({ role: "GOD" })).status).toBe(422);
  });

  it("deletes a user", async () => {
    const { agent } = await signedInAgent("ADMIN");
    const target = await createUser();
    expect((await agent.delete(api(`/${target.id}`))).status).toBe(204);
    expect((await agent.get(api(`/${target.id}`))).status).toBe(404);
  });
});
