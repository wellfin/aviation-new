import { describe, expect, it } from "vitest";
import { User } from "../src/modules/users/user.model.js";
import { ensureSuperAdmin } from "../src/modules/users/super-admin.js";
import { createUser, signedInAgent } from "./helpers.js";

const users = (p = "") => `/api/v1/admin/users${p}`;

describe("Super Admin", () => {
  it("is the first Admin, set once, and can't be changed, suspended or deleted by other Admins", async () => {
    const owner = await createUser({ role: "ADMIN" });
    const later = await createUser({ role: "ADMIN" });
    await ensureSuperAdmin();
    await ensureSuperAdmin();
    expect((await User.find({ superAdmin: true }).lean()).map((u) => String(u._id))).toEqual([owner.id]);

    const { agent } = await signedInAgent("ADMIN");
    expect((await agent.get(users(`/${owner.id}`))).body.data).toMatchObject({ superAdmin: true, role: "ADMIN" });
    expect((await agent.get(users(`/${later.id}`))).body.data.superAdmin).toBe(false);

    expect((await agent.patch(users(`/${owner.id}`)).send({ role: "MANAGER" })).status).toBe(403);
    expect((await agent.patch(users(`/${owner.id}`)).send({ status: "suspended" })).status).toBe(403);
    expect((await agent.delete(users(`/${owner.id}`))).status).toBe(403);
    expect(await User.findById(owner.id).lean()).toMatchObject({ role: "ADMIN", status: "active" });

    // Other Admins can still be managed.
    expect((await agent.patch(users(`/${later.id}`)).send({ status: "suspended" })).status).toBe(200);
  });
});
