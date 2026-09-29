import { expect, request, type APIRequestContext, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const API_URL = (process.env.E2E_API_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "") + "/api/v1";
const BACKEND_DIR = path.resolve(__dirname, "../../backend");
const OUTBOX_DIR = process.env.E2E_OUTBOX_DIR ?? path.join(BACKEND_DIR, ".mail-outbox");

/** Password that satisfies the API's rules (8+ chars, a letter and a digit). */
export const PASSWORD = "E2eFlight2026";

/** Unique, valid address per call, e.g. e2e+signup-lq3k9f2a1b2c@example.com. */
export function uniqueEmail(tag: string): string {
  return `e2e+${tag}-${Date.now().toString(36)}${randomBytes(2).toString("hex")}@example.com`;
}

/* ---------------------------------------------------------------- outbox -- */

export interface OutboxMail {
  file: string;
  to: string;
  subject: string;
  body: string;
  mtimeMs: number;
}

function readOutbox(): OutboxMail[] {
  if (!existsSync(OUTBOX_DIR)) return [];
  return readdirSync(OUTBOX_DIR)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => {
      const file = path.join(OUTBOX_DIR, f);
      const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const [head, ...rest] = raw.split("\n\n");
      const to = /^To:\s*(.+)$/m.exec(head)?.[1]?.trim() ?? "";
      const subject = /^Subject:\s*(.+)$/m.exec(head)?.[1]?.trim() ?? "";
      return { file, to, subject, body: rest.join("\n\n"), mtimeMs: statSync(file).mtimeMs };
    });
}

/**
 * Waits for the newest email to `to` (optionally with a subject containing
 * `subject`) written at or after `since` (ms epoch) and returns it.
 */
export async function waitForMail(to: string, opts: { subject?: string; since?: number; timeoutMs?: number } = {}): Promise<OutboxMail> {
  const { subject, since = 0, timeoutMs = 20_000 } = opts;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const matches = readOutbox()
      .filter((m) => m.to.toLowerCase() === to.toLowerCase() && (!subject || m.subject.includes(subject)) && m.mtimeMs >= since - 1_000)
      // File names start with an ISO timestamp, so name order is send order.
      .sort((a, b) => path.basename(b.file).localeCompare(path.basename(a.file)));
    if (matches[0]) return matches[0];
    if (Date.now() > deadline) throw new Error(`No email to ${to}${subject ? ` ("${subject}")` : ""} in ${OUTBOX_DIR}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** The numeric code in the newest matching email ("…code is 123456."). */
export async function readCode(to: string, opts: { subject?: string; since?: number; digits?: number } = {}): Promise<string> {
  const mail = await waitForMail(to, opts);
  const digits = opts.digits ? `{${opts.digits}}` : "{4,8}";
  const code = new RegExp(`code is (\\d${digits})\\b`).exec(mail.body)?.[1];
  if (!code) throw new Error(`No code found in ${mail.file}`);
  return code;
}

/** First http(s) link in the newest matching email. */
export async function readLink(to: string, opts: { subject?: string; since?: number } = {}): Promise<string> {
  const mail = await waitForMail(to, opts);
  const link = /https?:\/\/\S+/.exec(mail.body)?.[0];
  if (!link) throw new Error(`No link found in ${mail.file}`);
  return link;
}

/* ------------------------------------------------------------ API client -- */

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string; fieldErrors?: Record<string, string> };
}

/** Cookie-keeping API client (one session per instance) used for test setup and checks. */
export class Api {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<Api> {
    return new Api(await request.newContext({ extraHTTPHeaders: { Accept: "application/json" } }));
  }

  async call<T>(method: Method, url: string, data?: unknown): Promise<{ status: number; body: Envelope<T> }> {
    const res = await this.ctx.fetch(`${API_URL}${url}`, { method, data });
    const body = (await res.json().catch(() => ({}))) as Envelope<T>;
    return { status: res.status(), body };
  }

  /** Like `call`, but fails the test unless the response is 2xx. */
  async ok<T>(method: Method, url: string, data?: unknown): Promise<T> {
    const { status, body } = await this.call<T>(method, url, data);
    expect(status, `${method} ${url} → ${status} ${JSON.stringify(body.error ?? "")}`).toBeLessThan(300);
    return body.data as T;
  }

  /** Website sign-in (users & providers). */
  async login(email: string, password: string): Promise<void> {
    await this.ok("POST", "/auth/login", { email, password });
  }

  /** Staff console sign-in — a separate session from the website. */
  async adminLogin(email: string, password: string): Promise<void> {
    await this.ok("POST", "/admin/auth/login", { email, password });
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Registers and verifies a user through the real API (the code is read from the outbox). */
export async function createVerifiedUser(tag: string, extra: Record<string, unknown> = {}): Promise<TestUser> {
  const user: TestUser = { email: uniqueEmail(tag), password: PASSWORD, firstName: "Eddie", lastName: "Tester" };
  const api = await Api.create();
  try {
    const since = Date.now();
    await api.ok("POST", "/auth/register", { ...user, ...extra });
    const code = await readCode(user.email, { subject: "Verify", since });
    await api.ok("POST", "/auth/verify-email", { email: user.email, code });
  } finally {
    await api.dispose();
  }
  return user;
}

let shared: Promise<TestUser> | null = null;

/**
 * One verified USER account reused by tests that don't change it (saves auth
 * requests against the API's per-IP rate limit). Tests that change the password
 * must create their own user.
 */
export function sharedUser(): Promise<TestUser> {
  shared ??= createVerifiedUser("shared");
  return shared;
}

/** Dev admin credentials from ../backend/.dev-admin.txt (or E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD). */
export function adminCredentials(): { email: string; password: string } {
  if (process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD) {
    return { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
  }
  const raw = readFileSync(path.join(BACKEND_DIR, ".dev-admin.txt"), "utf8");
  const read = (key: string) => new RegExp(`^${key}=(.*)$`, "m").exec(raw)?.[1]?.trim() ?? "";
  return { email: read("ADMIN_EMAIL"), password: read("ADMIN_PASSWORD") };
}

let admin: Promise<Api> | null = null;

/** API client signed in as the dev admin (one session per worker). */
export function adminApi(): Promise<Api> {
  admin ??= (async () => {
    const api = await Api.create();
    const { email, password } = adminCredentials();
    await api.adminLogin(email, password);
    return api;
  })();
  return admin;
}

/* ------------------------------------------------------------ UI helpers -- */

/** Signs in through the login form and waits for the redirect to `next`. */
export async function uiLogin(page: Page, email: string, password: string, next = "/account"): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  const target = next.split("?")[0];
  await page.waitForURL((url) => url.pathname === target);
}

/** Types a code into the 6-box OTP input (focus moves box to box). */
export async function fillOtp(page: Page, code: string): Promise<void> {
  await page.getByLabel("Digit 1", { exact: true }).click();
  await page.keyboard.type(code);
}
