import { describe, expect, it } from "vitest";
import { User } from "../src/modules/users/user.model.js";
import { signedInAgent } from "./helpers.js";

const roles = (p = "") => `/api/v1/admin/roles${p}`;

describe("built-in Admin and Manager roles", () => {
  it("only the Super Admin changes them; changes apply straight away; reset restores the defaults", async () => {
    const { agent: owner, user: ownerUser } = await signedInAgent("ADMIN");
    await User.updateOne({ _id: ownerUser._id }, { $set: { superAdmin: true } });
    const { agent: admin } = await signedInAgent("ADMIN");
    const { agent: manager } = await signedInAgent("MANAGER");

    // A normal Admin can't change them.
    expect((await admin.put(roles("/built-in/MANAGER")).send({ permissions: ["reviews:moderate"] })).status).toBe(403);
    expect((await manager.get("/api/v1/admin/news")).status).toBe(200);

    // Super Admin takes News & FAQs away from Managers.
    const r = await owner.put(roles("/built-in/MANAGER")).send({ permissions: ["reviews:moderate", "users:manage"] });
    expect(r.status).toBe(200);
    const managerRole = r.body.data.find((x: { key: string }) => x.key === "MANAGER");
    // users:manage can't be given to Managers; it's dropped.
    expect(managerRole).toMatchObject({ permissions: ["reviews:moderate"], customised: true });
    expect((await manager.get("/api/v1/admin/news")).status).toBe(403);

    // Admins without users:manage can no longer add users; the Super Admin keeps everything.
    expect((await owner.put(roles("/built-in/ADMIN")).send({ permissions: ["users:read", "reports:read"] })).status).toBe(200);
    expect((await admin.post("/api/v1/admin/roles").send({ name: "Sales", permissions: ["leads:read"] })).status).toBe(403);
    expect((await owner.post("/api/v1/admin/roles").send({ name: "Sales", permissions: ["leads:read"] })).status).toBe(201);

    // Reset.
    await owner.put(roles("/built-in/MANAGER")).send({ permissions: null });
    await owner.put(roles("/built-in/ADMIN")).send({ permissions: null });
    expect((await manager.get("/api/v1/admin/news")).status).toBe(200);
    expect((await admin.post("/api/v1/admin/roles").send({ name: "Ops", permissions: ["leads:read"] })).status).toBe(201);
  });
});
