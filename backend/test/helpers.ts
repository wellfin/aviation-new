import type { Router } from "express";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/lib/crypto.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import type { Role } from "../src/modules/rbac/permissions.js";
import { User, type UserDoc } from "../src/modules/users/user.model.js";

export const app = createApp();

/** App with additional routers mounted under /api/v1 (for modules not yet registered in routes.ts). */
export function appWith(...routes: Array<[path: string, router: Router]>) {
  return createApp({ extraRoutes: routes });
}
export const ORIGIN = "http://localhost:3100";
export const PASSWORD = "Flight1234";

let counter = 0;

export async function createUser(overrides: Partial<{ email: string; role: Role; verified: boolean; status: "active" | "suspended" }> = {}): Promise<UserDoc> {
  counter += 1;
  return User.create({
    email: overrides.email ?? `user${counter}_${Date.now()}@example.com`,
    firstName: "Test",
    lastName: `User${counter}`,
    passwordHash: await hashPassword(PASSWORD),
    role: overrides.role ?? "USER",
    status: overrides.status ?? "active",
    emailVerifiedAt: overrides.verified === false ? undefined : new Date(),
  });
}

/** A supertest agent (keeps cookies) that is signed in as a new user with `role`. */
export async function signedInAgent(role: Role = "USER", target = app): Promise<{ agent: TestAgent; user: UserDoc }> {
  const user = await createUser({ role });
  const agent = request.agent(target);
  // Staff sign in to the admin console; users and providers to the website.
  const loginPath = role === "MANAGER" || role === "ADMIN" ? "/api/v1/admin/auth/login" : "/api/v1/auth/login";
  const res = await agent.post(loginPath).set("Origin", ORIGIN).send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user };
}

/** Extracts the most recent numeric code emailed to `to`. */
export function lastCodeFor(to: string): string {
  const msg = [...testOutbox].reverse().find((m) => m.to === to);
  const match = msg?.text.match(/\b(\d{4,8})\b/);
  if (!match?.[1]) throw new Error(`no code emailed to ${to}`);
  return match[1];
}

export function cookieValue(setCookie: string[] | string | undefined, name: string): string | undefined {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const entry = list.find((c) => c.startsWith(`${name}=`));
  return entry?.split(";")[0]?.slice(name.length + 1);
}
