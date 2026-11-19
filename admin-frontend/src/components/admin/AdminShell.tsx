"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, Search, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { can, useAuth, type SessionUser } from "@/lib/auth/auth-context";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";
import { ADMIN_ENTRY_PERMISSIONS, ADMIN_NAV, type AdminNavItem } from "./nav";

const COLLAPSE_KEY = "ga_admin_nav_collapsed";

function roleLabel(user: SessionUser): string {
  if (user.superAdmin) return "Super admin";
  if (user.role === "ADMIN") return "Admin";
  return "Staff";
}

/**
 * Admin chrome + client-side access gate. The gate only improves UX: every
 * admin API call is authorised by the backend independently.
 *
 * Layout: a floating sidebar card (grouped menu, user card at the bottom) and a floating top bar
 * with a menu button and a page search (Ctrl/⌘ K).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The shell shows a spinner until the session loads, so reading storage here can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  // Keep the current page's menu item in view in the sidebar.
  useEffect(() => {
    document.querySelector('nav[aria-label="Admin"] [aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, user]);

  // Staff whose role has no Dashboard start on the first page they can open.
  const firstAllowed = user ? ADMIN_NAV.flatMap((g) => g.items).find((i) => can(user, i.permission))?.href : undefined;
  useEffect(() => {
    if (user && pathname === "/admin" && !can(user, "reports:read") && firstAllowed && firstAllowed !== "/admin") router.replace(firstAllowed);
  }, [user, pathname, firstAllowed, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" role="status" aria-live="polite">
        <span className="size-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!ADMIN_ENTRY_PERMISSIONS.some((p) => can(user, p))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
        <ShieldAlert className="size-12 text-danger" aria-hidden />
        <h1 className="text-2xl font-extrabold text-ink">Access denied</h1>
        <p className="max-w-sm text-muted">Your account doesn&apos;t have access to the admin area.</p>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="font-semibold text-brand hover:underline"
        >
          Sign in with a different account
        </button>
      </div>
    );
  }

  const groups = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(user, i.permission)) })).filter((g) => g.items.length);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  const narrow = collapsed && !open;

  const signOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="admin-bg min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "glass fixed inset-y-3 left-3 z-40 flex flex-col overflow-hidden rounded-3xl border transition-all duration-200",
          narrow ? "lg:w-[76px]" : "lg:w-64",
          "w-64",
          open ? "translate-x-0" : "-translate-x-[calc(100%+24px)] lg:translate-x-0",
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 pt-4 pb-3", narrow && "lg:justify-center lg:px-0")}>
          <Link href="/admin" className="flex min-w-0 items-center gap-3" aria-label="Admin dashboard">
            <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Image src="/images/shared/logo-plane.svg" alt="" width={20} height={20} priority />
            </span>
            <span className={cn("min-w-0", narrow && "lg:hidden")}>
              <span className="block truncate text-[15px] leading-5 font-extrabold text-ink">Global Aviation</span>
              <span className="block text-xs text-muted">Admin console</span>
            </span>
          </Link>
          <button type="button" className="ml-auto text-muted lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-3">
          {groups.map((g) => (
            <div key={g.label} className="mt-3 first:mt-1">
              <p className={cn("px-3 pb-1.5 text-[11px] font-semibold tracking-[1px] text-muted uppercase", narrow && "lg:sr-only")}>{g.label}</p>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href} className="relative">
                      {active && <span className="absolute top-1.5 -left-3 h-[calc(100%-12px)] w-1 rounded-r-full bg-brand" aria-hidden />}
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={narrow ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                          narrow && "lg:justify-center lg:px-0",
                          active ? "bg-brand/10 font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(47,128,237,0.15)]" : "font-medium text-ink/80 hover:bg-white/70 hover:text-ink",
                        )}
                      >
                        <item.icon className="size-[18px] shrink-0" aria-hidden />
                        <span className={cn("truncate", narrow && "lg:hidden")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("flex items-center gap-3 border-t border-line p-4", narrow && "lg:flex-col lg:px-2")}>
          <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" aria-hidden>
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </span>
          <span className={cn("min-w-0 flex-1", narrow && "lg:hidden")}>
            <span className="block truncate text-sm font-semibold text-ink">
              {user.firstName} {user.lastName}
            </span>
            <span className="block truncate text-xs text-muted">{roleLabel(user)}</span>
          </span>
          <button type="button" onClick={signOut} aria-label="Log out" title="Log out" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      {/* Main column */}
      <div className={cn("flex min-w-0 flex-col transition-all duration-200", narrow ? "lg:pl-[100px]" : "lg:pl-[280px]")}>
        <header className="sticky top-0 z-20 px-3 pt-3 pb-1 lg:pr-4 lg:pl-1">
          <div className="glass flex h-14 items-center gap-2 rounded-2xl border px-3">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl text-ink hover:bg-surface"
              aria-label={open ? "Close menu" : "Toggle menu"}
              onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? toggleCollapsed() : setOpen(true))}
            >
              <Menu className="size-5" />
            </button>
            <PageSearch items={groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))} />
            <div className="ml-auto flex items-center gap-1">
              <a href={publicConfig.siteUrl} target="_blank" rel="noreferrer" title="Open public site" aria-label="Open public site" className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-ink">
                <ExternalLink className="size-[18px]" />
              </a>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 px-3 py-6 md:px-4 lg:pr-4 lg:pl-1">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Top-bar search: jump to any admin page you can open. Ctrl/⌘ K focuses it. */
function PageSearch({ items }: { items: Array<AdminNavItem & { group: string }> }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? items.filter((i) => i.label.toLowerCase().includes(term) || i.group.toLowerCase().includes(term)) : items;
  }, [q, items]);

  const go = (href: string) => {
    setQ("");
    input.current?.blur();
    router.push(href);
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="Search pages…"
        aria-label="Search admin pages"
        onChange={(e) => {
          setQ(e.target.value);
          setIndex(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && matches[index]) {
            e.preventDefault();
            go(matches[index].href);
          } else if (e.key === "Escape") {
            input.current?.blur();
          }
        }}
        className="h-10 w-full rounded-xl border border-line bg-white/60 pr-14 pl-9 text-sm outline-none focus:border-brand focus:bg-white focus:ring-3 focus:ring-brand/15"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 font-sans text-[11px] text-muted sm:block">Ctrl K</kbd>
      {focused && matches.length > 0 && (
        <ul className="absolute top-12 left-0 z-50 max-h-80 w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-card" role="listbox" aria-label="Pages">
          {matches.map((m, i) => (
            <li key={m.href} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(m.href)}
                onMouseEnter={() => setIndex(i)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === index ? "bg-brand/10 text-brand" : "text-ink")}
              >
                <m.icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate font-medium">{m.label}</span>
                <span className="text-xs text-muted">{m.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
