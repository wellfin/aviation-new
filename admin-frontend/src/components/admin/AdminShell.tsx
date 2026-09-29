"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Menu, ShieldAlert, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { can, useAuth } from "@/lib/auth/auth-context";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";
import { ADMIN_ENTRY_PERMISSIONS, ADMIN_NAV } from "./nav";

/**
 * Admin chrome + client-side access gate. The gate only improves UX: every
 * admin API call is authorised by the backend independently.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

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

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-[11px] font-bold tracking-[1px] text-white/35 uppercase">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active ? "bg-brand-gradient text-white shadow-[0_4px_14px_rgba(47,128,237,0.35)]" : "text-white/70 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className={cn("bg-header-gradient fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-8 overflow-y-auto p-5 transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" className="text-white/70 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        {nav}
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <a href={publicConfig.siteUrl} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="size-4" /> Open public site
          </a>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/60 hover:text-white"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-8">
          <button type="button" className="flex size-10 items-center justify-center rounded-xl border border-line lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold text-muted">Admin console</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="block font-semibold text-ink">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs text-muted">{user.role}</span>
            </span>
            <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-xs font-bold text-white">
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </span>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
