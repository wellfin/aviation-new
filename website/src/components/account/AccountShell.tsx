"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { apiRequest } from "@/lib/api/client";
import { can, useAuth, type SessionUser } from "@/lib/auth/auth-context";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";
import { ACCOUNT_NAV, isActive } from "./nav";
import type { AccountProfile } from "./types";

interface AccountContextValue {
  user: SessionUser;
  /** Full profile from GET /auth/me (phone, company…); null until loaded or in mock mode. */
  profile: AccountProfile | null;
  setProfile: (p: AccountProfile) => void;
  /** Display name kept fresh after profile edits in this area. */
  displayName: { firstName: string; lastName: string };
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountShell>");
  return ctx;
}

/** Business (provider) tools. Staff never sign in here — they use the separate admin console. */
export function isBusiness(user: SessionUser | null): boolean {
  return can(user, "listing:manage:own");
}

/** Signed-in dashboard chrome: client-side guard, hero band, sub-navigation. */
export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    if (loading || user || signingOut) return;
    // Keep the query (e.g. /account/billing?plan=pro) so the user lands back on the same view.
    router.replace(`/login?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`);
  }, [loading, user, signingOut, router, pathname]);

  // Keep the active mobile tab visible in the horizontally scrolling tab strip.
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const strip = mobileNav.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (strip && active) strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
  }, [pathname, user]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId || publicConfig.dataSource !== "api") return;
    let cancelled = false;
    apiRequest<AccountProfile>("GET", "/auth/me")
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || !user) {
    return (
      <div className="container-site py-16" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your account…</span>
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden h-80 animate-pulse rounded-card bg-surface lg:block" />
          <div className="h-80 animate-pulse rounded-card bg-surface" />
        </div>
      </div>
    );
  }

  const current = profile && profile.id === user.id ? profile : null;
  const displayName = { firstName: current?.firstName ?? user.firstName, lastName: current?.lastName ?? user.lastName };
  const business = isBusiness(user);
  const items = ACCOUNT_NAV.filter((i) => (!i.permission || can(user, i.permission)) && (i.group !== "business" || business));
  const businessItems = items.filter((i) => i.group === "business");

  async function handleLogout() {
    setSigningOut(true);
    await logout();
    router.push("/");
  }

  const navLink = (i: (typeof items)[number], mobile: boolean) => {
    const active = isActive(pathname, i.href);
    const Icon = i.icon;
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          mobile
            ? "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap"
            : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
          active
            ? mobile
              ? "border-brand bg-brand text-white"
              : "bg-brand/8 text-brand"
            : mobile
              ? "border-line bg-white text-muted hover:text-ink"
              : "text-muted hover:bg-surface hover:text-ink",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {i.label}
      </Link>
    );
  };

  return (
    <AccountContext.Provider value={{ user, profile: current, setProfile, displayName }}>
      <section className="bg-hero-navy text-white">
        <div className="container-site flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-10">
          <div>
            <Eyebrow tone="light">{user.role === "PROVIDER" ? "Business account" : "My account"}</Eyebrow>
            <p className="mt-3 text-2xl font-extrabold tracking-[-0.5px] md:text-3xl">
              Welcome back, <span className="text-brand-gradient">{displayName.firstName}</span>
            </p>
            <p className="mt-1 text-sm text-white/60">{user.email}</p>
          </div>
        </div>
      </section>

      <div className="container-site grid gap-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-10">
        <nav ref={mobileNav} aria-label="Account" className="relative -mx-4 overflow-x-auto px-4 scrollbar-none lg:hidden">
          <div className="flex gap-2">{items.map((i) => navLink(i, true))}</div>
        </nav>

        <aside className="hidden lg:block">
          <nav aria-label="Account" className="sticky top-24 rounded-card border border-line bg-white p-3 shadow-soft">
            <p className="px-3 pt-1 pb-2 text-[11px] font-bold tracking-[1px] text-subtle uppercase">Account</p>
            <div className="flex flex-col gap-0.5">{items.filter((i) => i.group === "account").map((i) => navLink(i, false))}</div>
            {businessItems.length > 0 && (
              <>
                <p className="mt-3 border-t border-line px-3 pt-4 pb-2 text-[11px] font-bold tracking-[1px] text-subtle uppercase">Business</p>
                <div className="flex flex-col gap-0.5">{businessItems.map((i) => navLink(i, false))}</div>
              </>
            )}
            <div className="mt-3 border-t border-line pt-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-danger/5 hover:text-danger disabled:opacity-60"
              >
                <LogOut className="size-4" aria-hidden />
                {signingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </AccountContext.Provider>
  );
}
