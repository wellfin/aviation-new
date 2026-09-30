"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Inbox, LogOut, Menu, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ServicesMenu, serviceHref } from "./ServicesMenu";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useCategories } from "@/components/categories/CategoriesContext";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/directory", dropdown: true },
  { label: "Directory", href: "/directory" },
  { label: "News", href: "/news" },
  { label: "Pricing", href: "/pricing" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact", href: "/contact" },
] as const;

function isActive(pathname: string, href: string, label: string): boolean {
  if (href === "/") return pathname === "/";
  if (label === "Services") return pathname.startsWith("/providers");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const menuCategories = useCategories().categories.filter((c) => c.showInMenu);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation (state reset during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setServicesOpen(false);
    setUserOpen(false);
  }

  // Close dropdowns on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setUserOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    await logout();
    // Full navigation: drops all client state, and wins over protected pages (e.g. /account)
    // that react to the signed-out state by redirecting to /login.
    window.location.assign(new URL("/", window.location.origin).href);
  }

  return (
    <header className="bg-header-gradient sticky top-0 z-50 border-b border-white/8">
      <div className="container-site flex h-[68px] items-center gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-6 lg:flex xl:gap-14">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.label);
            const linkCls = cn(
              "relative flex items-center gap-1 px-1 py-1.5 text-sm font-medium transition hover:text-white",
              active ? "text-white" : "text-white/80",
            );
            const underline = (
              <span className={cn("absolute top-[31px] left-0 h-0.5 bg-gradient-to-r from-brand to-brand-cyan transition-all", active ? "w-full" : "w-0")} />
            );
            if ("dropdown" in item) {
              return (
                <div key={item.label} ref={servicesRef} className="relative">
                  <button type="button" className={linkCls} aria-expanded={servicesOpen} aria-haspopup="menu" onClick={() => setServicesOpen((v) => !v)}>
                    {item.label}
                    <Image src="/images/shared/chevron-down.svg" alt="" width={12} height={12} className={cn("transition", servicesOpen && "rotate-180")} />
                    {underline}
                  </button>
                  {servicesOpen && <ServicesMenu categories={menuCategories} onNavigate={() => setServicesOpen(false)} />}
                </div>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={linkCls} aria-current={active ? "page" : undefined}>
                {item.label}
                {underline}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button type="button" className="hidden h-9 items-center rounded-xl bg-white/8 px-3 text-sm font-medium text-white/70 sm:flex" aria-label="Language: English">
            🌐 EN
          </button>
          {user ? (
            <div ref={userRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                aria-expanded={userOpen}
                aria-haspopup="menu"
                className="flex h-9 items-center gap-2 rounded-xl bg-white/8 pr-3 pl-1 text-sm font-semibold text-white"
              >
                <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-lg text-xs">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
                {user.firstName}
              </button>
              {userOpen && (
                <div role="menu" className="absolute top-11 right-0 w-56 rounded-2xl border border-line bg-white p-2 shadow-card">
                  <p className="px-3 py-2 text-xs text-muted">
                    Signed in as
                    <br />
                    <span className="font-semibold text-ink">{user.email}</span>
                  </p>
                  <Link role="menuitem" href="/account" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface">
                    <User className="size-4" /> My account
                  </Link>
                  {can(user, "listing:manage:own") && (
                    <>
                      <Link role="menuitem" href="/account/listing" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface">
                        <Building2 className="size-4" /> My listing
                      </Link>
                      <Link role="menuitem" href="/account/enquiries" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface">
                        <Inbox className="size-4" /> Enquiries
                      </Link>
                    </>
                  )}
                  <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/5">
                    <LogOut className="size-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:block">
                Login
              </Link>
              <Link href="/signup" className="bg-brand-gradient hidden h-[38px] items-center rounded-xl px-[18px] text-[13px] font-semibold text-white sm:flex">
                Sign Up
              </Link>
            </>
          )}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl bg-white/8 text-white lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-white/8 bg-navy-950 lg:hidden">
          <div className="container-site flex flex-col py-3">
            {NAV.filter((n) => n.label !== "Services").map((item) => (
              <Link key={item.label} href={item.href} className={cn("rounded-lg px-3 py-3 text-[15px] font-medium", isActive(pathname, item.href, item.label) ? "bg-white/8 text-white" : "text-white/80")}>
                {item.label}
              </Link>
            ))}
            <p className="px-3 pt-4 pb-2 text-xs font-bold tracking-[1px] text-white/40 uppercase">Services</p>
            <div className="grid grid-cols-2 gap-1">
              {menuCategories.map((c) => (
                <Link key={c.slug} href={serviceHref(c.slug)} className="rounded-lg px-3 py-2 text-sm text-white/70">
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex gap-2 border-t border-white/8 pt-4">
              {user ? (
                <button type="button" onClick={handleLogout} className="flex-1 rounded-xl bg-white/8 py-3 text-sm font-semibold text-white">
                  Log out
                </button>
              ) : (
                <>
                  <Link href="/login" className="flex-1 rounded-xl bg-white/8 py-3 text-center text-sm font-semibold text-white">
                    Login
                  </Link>
                  <Link href="/signup" className="bg-brand-gradient flex-1 rounded-xl py-3 text-center text-sm font-semibold text-white">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
