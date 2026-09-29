"use client";

import { publicConfig } from "@/lib/public-config";

/**
 * Browser → backend API client (/api/v1). Used by forms and auth.
 * When NEXT_PUBLIC_DATA_SOURCE=mock, requests are simulated locally so the UI
 * can be exercised end-to-end before the backend exists.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export type MockHandler = (body: unknown) => unknown;

const mockHandlers = new Map<string, MockHandler>();

/** Register a simulated response for an endpoint (mock mode only). */
export function registerMock(method: string, path: string, handler: MockHandler): void {
  mockHandlers.set(`${method.toUpperCase()} ${path}`, handler);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiRequest<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  if (publicConfig.dataSource === "mock") {
    await delay(500);
    const handler = mockHandlers.get(`${method} ${path}`);
    // Handlers throw ApiError to simulate validation / auth failures.
    return (handler ? handler(body) : { ok: true }) as T;
  }

  let res = await send(method, path, body);
  // Access tokens are short-lived: refresh once (shared across concurrent calls) and retry.
  if (res.status === 401 && path !== "/admin/auth/refresh" && (await isRefreshable(res)) && (await refreshSession())) {
    res = await send(method, path, body);
  }

  const payload = (await res.json().catch(() => null)) as { data?: T; error?: ApiErrorBody } | null;
  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? { code: "UNKNOWN", message: "Something went wrong. Please try again." });
  }
  if (SESSION_STARTERS.has(path)) setSessionHint(true);
  else if (path === "/admin/auth/logout") setSessionHint(false);
  return payload?.data as T;
}

/*
 * Session hint. Auth cookies are httpOnly and the access cookie expires with its
 * token, so a 401 looks the same for "anonymous visitor" and "access token
 * expired". Without a hint every anonymous page view would call /admin/auth/refresh
 * (which is rate limited per IP). The hint only marks "this browser signed in
 * before" — it carries no credentials and the API still decides everything.
 */
const SESSION_HINT_KEY = "ga_admin_session";
const SESSION_STARTERS = new Set(["/admin/auth/login", "/auth/verify-email", "/admin/auth/me", "/admin/auth/refresh"]);

function hasSessionHint(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return true; // storage unavailable: fall back to always trying a refresh
  }
}

function setSessionHint(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(SESSION_HINT_KEY, "1");
    else window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* private mode — hasSessionHint() then always allows a refresh */
  }
}

function send(method: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${publicConfig.apiBaseUrl}/api/v1${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function isRefreshable(res: Response): Promise<boolean> {
  const payload = (await res.clone().json().catch(() => null)) as { error?: ApiErrorBody } | null;
  const code = payload?.error?.code;
  if (code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN") return true;
  // The access cookie expires with the token, so an expired session usually arrives as a plain
  // UNAUTHORIZED — only worth a refresh if this browser has signed in before.
  return code === "UNAUTHORIZED" && hasSessionHint();
}

let refreshing: Promise<boolean> | null = null;

/** Rotates the refresh token; concurrent callers share one in-flight refresh. */
function refreshSession(): Promise<boolean> {
  refreshing ??= send("POST", "/admin/auth/refresh", undefined)
    .then((r) => {
      // A rejected refresh token means the session is over; stop trying until the next sign-in.
      if (r.status === 401) setSessionHint(false);
      return r.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export const apiPost = <T = { ok: true }>(path: string, body: unknown) => apiRequest<T>("POST", path, body);
