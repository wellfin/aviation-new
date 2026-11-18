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

    const { agent, user: me } = await signedInAgent("ADMIN");
    expect((await agent.get(users(`/${owner.id}`))).body.data).toMatchObject({ superAdmin: true, role: "ADMIN" });
    expect((await agent.get(users(`/${later.id}`))).body.data.superAdmin).toBe(false);

    expect((await agent.patch(users(`/${owner.id}`)).send({ role: "MANAGER" })).status).toBe(403);
    expect((await agent.patch(users(`/${owner.id}`)).send({ status: "suspended" })).status).toBe(403);
    expect((await agent.delete(users(`/${owner.id}`))).status).toBe(403);
    expect(await User.findById(owner.id).lean()).toMatchObject({ role: "ADMIN", status: "active" });

    // Roles page: built-in staff roles with counts (no User/Provider).
    const built = (await agent.get("/api/v1/admin/roles/built-in")).body.data as Array<{ key: string; userCount: number }>;
    expect(built.map((r) => [r.key, r.userCount])).toEqual([
      ["SUPER_ADMIN", 1],
      ["ADMIN", 2],
      ["MANAGER", 0],
    ]);

    // Lead emails: only the Super Admin can switch its own; Admins can switch other staff's.
    expect((await agent.put(users(`/${owner.id}/lead-emails`)).send({ enabled: false })).status).toBe(403);
    const other = await agent.put(users(`/${later.id}/lead-emails`)).send({ enabled: false });
    expect(other.status).toBe(200);
    expect(other.body.data.leadEmails).toBe(false);
    // Anyone can switch their own (here: the signed-in Admin).
    expect((await agent.put(users(`/${me.id}/lead-emails`)).send({ enabled: false })).body.data.leadEmails).toBe(false);
    expect((await agent.put(users(`/${me.id}/lead-emails`)).send({ enabled: true })).body.data.leadEmails).toBe(true);
    expect((await User.findById(owner.id).lean())?.leadEmails).toBe(true);

    // Other Admins can still be managed.
    expect((await agent.patch(users(`/${later.id}`)).send({ status: "suspended" })).status).toBe(200);
  });
});
