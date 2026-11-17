import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, ORIGIN, signedInAgent } from "./helpers.js";

const roles = (p = "") => `/api/v1/admin/roles${p}`;
const users = (p = "") => `/api/v1/admin/users${p}`;

async function adminLogin(email: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/admin/auth/login").set("Origin", ORIGIN).send({ email, password });
  return { agent, res };
}

describe("custom staff roles", () => {
  it("only admins create, edit and delete roles; managers can read them", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    const { agent: manager } = await signedInAgent("MANAGER");
    const body = { name: "Content Editor", description: "News and FAQs", permissions: ["content:manage"] };
    expect((await manager.post(roles()).send(body)).status).toBe(403);
    const c = await admin.post(roles()).send(body);
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ name: "Content Editor", permissions: ["content:manage"], userCount: 0 });

    expect((await manager.get(roles())).body.data.map((r: { name: string }) => r.name)).toEqual(["Content Editor"]);
    expect((await admin.post(roles()).send({ ...body, name: "content editor" })).status).toBe(409);
    // Adding users and editing roles can't be handed out.
    expect((await admin.post(roles()).send({ name: "Boss", permissions: ["users:manage"] })).status).toBe(422);
    expect((await admin.post(roles()).send({ name: "Empty", permissions: [] })).status).toBe(422);
    expect((await admin.get(roles("/permissions"))).body.data).not.toContain("users:manage");
  });

  it("adds a staff user with a custom role whose permissions apply at once", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    const role = (await admin.post(roles()).send({ name: "Airport Team", permissions: ["airports:manage"] })).body.data;

    const add = await admin.post(users()).send({ firstName: "Asha", lastName: "Rao", email: "asha@jetco.aero", password: "Runway2026", role: "MANAGER", staffRole: role.id });
    expect(add.status).toBe(201);
    expect(add.body.data).toMatchObject({ email: "asha@jetco.aero", role: "MANAGER", emailVerified: true, staffRole: { id: role.id, name: "Airport Team" } });

    const { agent: asha, res } = await adminLogin("asha@jetco.aero", "Runway2026");
    expect(res.status).toBe(200);
    expect(res.body.data.permissions).toEqual(expect.arrayContaining(["airports:manage", "uploads:create"]));
    expect(res.body.data.permissions).not.toContain("providers:manage");
    expect((await asha.get("/api/v1/admin/airports")).status).toBe(200);
    expect((await asha.get("/api/v1/admin/providers")).status).toBe(403);

    // Editing the role changes what its people can do on the next request.
    await admin.patch(roles(`/${role.id}`)).send({ permissions: ["airports:manage", "providers:manage"] });
    expect((await asha.get("/api/v1/admin/providers")).status).toBe(200);
    expect((await asha.get("/api/v1/admin/auth/me")).body.data.permissions).toContain("providers:manage");

    // A role in use can't be removed; after moving its user back to the standard Manager role it can.
    expect((await admin.delete(roles(`/${role.id}`))).status).toBe(409);
    expect((await admin.get(roles(`/${role.id}`))).body.data.userCount).toBe(1);
    const back = await admin.patch(users(`/${add.body.data.id}`)).send({ staffRole: null });
    expect(back.body.data.staffRole).toBeNull();
    expect((await admin.delete(roles(`/${role.id}`))).status).toBe(204);
  });

  it("validates new users: work email, unique email, existing role, admin only", async () => {
    const { agent: admin } = await signedInAgent("ADMIN");
    const { agent: manager } = await signedInAgent("MANAGER");
    const base = { firstName: "Ben", lastName: "Hall", email: "ben@flyops.com", password: "Runway2026", role: "ADMIN" };
    expect((await manager.post(users()).send(base)).status).toBe(403);
    expect((await admin.post(users()).send({ ...base, email: "ben@gmail.com" })).status).toBe(422);
    expect((await admin.post(users()).send({ ...base, password: "short" })).status).toBe(422);
    expect((await admin.post(users()).send({ ...base, role: "MANAGER", staffRole: "64b7f0f0f0f0f0f0f0f0f0f0" })).status).toBe(422);
    const ok = await admin.post(users()).send(base);
    expect(ok.status).toBe(201);
    expect(ok.body.data.staffRole).toBeNull();
    expect((await admin.post(users()).send(base)).status).toBe(409);
    expect((await adminLogin("ben@flyops.com", "Runway2026")).res.status).toBe(200);
  });
});
