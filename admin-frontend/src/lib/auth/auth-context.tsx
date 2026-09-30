"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import { publicConfig } from "@/lib/public-config";

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  /** Server-computed permissions (API mode). Used only to shape the UI — the API enforces them. */
  permissions?: string[];
  emailVerified?: boolean;
}

export type UserRole = "USER" | "PROVIDER" | "MANAGER" | "ADMIN";

const MOCK_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  USER: ["profile:manage", "favorites:manage", "reviews:create", "enquiries:create"],
  PROVIDER: ["profile:manage", "favorites:manage", "reviews:create", "enquiries:create", "listing:manage:own", "enquiries:read:own", "billing:manage:own", "uploads:create"],
  MANAGER: [],
  ADMIN: [],
};

/** True when the signed-in user holds `permission` (UI hint only; the API is authoritative). */
export function can(user: SessionUser | null, permission: string): boolean {
  if (!user) return false;
  return (user.permissions ?? MOCK_ROLE_PERMISSIONS[user.role]).includes(permission);
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ------------------------------------------------------------------
 * Mock mode: a browser-only stand-in for the auth API. Never used when
 * NEXT_PUBLIC_DATA_SOURCE=api.
 * ------------------------------------------------------------------ */
const MOCK_USERS_KEY = "ga_mock_users";
const MOCK_SESSION_KEY = "ga_mock_session";
const MOCK_DEMO_ACCOUNT = { email: "demo@globalaviation.test", password: "Demo1234" };

interface MockUserRecord extends SessionUser {
  password: string;
  verified: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
}

function mockUsers(): MockUserRecord[] {
  const users = readJson<MockUserRecord[]>(MOCK_USERS_KEY, []);
  if (!users.some((u) => u.email === MOCK_DEMO_ACCOUNT.email)) {
    users.push({
      id: "usr_demo",
      firstName: "James",
      lastName: "Henderson",
      email: MOCK_DEMO_ACCOUNT.email,
      role: "USER",
      password: MOCK_DEMO_ACCOUNT.password,
      verified: true,
    });
  }
  return users;
}

function toSession(u: MockUserRecord): SessionUser {
  return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role };
}

const invalid = (message: string, code = "INVALID_CREDENTIALS") => new ApiError(401, { code, message });

export function AuthProvider({ children }: { children: ReactNode }) {
  const isMock = publicConfig.dataSource === "mock";
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = isMock ? readJson<SessionUser | null>(MOCK_SESSION_KEY, null) : await apiRequest<SessionUser>("GET", "/admin/auth/me");
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMock]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      if (!isMock) {
        const u = await apiRequest<SessionUser>("POST", "/admin/auth/login", { email, password, remember });
        setUser(u);
        return u;
      }
      await new Promise((r) => setTimeout(r, 500));
      const rec = mockUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!rec || rec.password !== password) throw invalid("Incorrect email or password.");
      if (!rec.verified) throw invalid("Please verify your email before signing in.", "EMAIL_NOT_VERIFIED");
      const session = toSession(rec);
      writeJson(MOCK_SESSION_KEY, session);
      setUser(session);
      return session;
    },
    [isMock],
  );

  const logout = useCallback(async () => {
    if (!isMock) await apiRequest("POST", "/admin/auth/logout").catch(() => undefined);
    else window.localStorage.removeItem(MOCK_SESSION_KEY);
    setUser(null);
  }, [isMock]);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
