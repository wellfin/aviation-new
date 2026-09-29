"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { can } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { useAccount } from "./AccountShell";

/** Renders children only for sessions holding `permission` (UX only — the API enforces it). */
export function RequirePermission({ permission, children, title }: { permission: string; children: ReactNode; title: string }) {
  const { user } = useAccount();
  if (can(user, permission)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-soft">
      <Lock className="size-9 text-subtle" aria-hidden />
      <h1 className="text-lg font-bold text-ink">{title} is for business accounts</h1>
      <p className="max-w-md text-sm text-muted">
        This section is available to aviation businesses listed in the directory. Create a business account to publish a listing, receive enquiries and manage your plan.
      </p>
      <ButtonLink href="/signup?type=provider" size="sm" className="mt-2">
        Create a business account
      </ButtonLink>
    </div>
  );
}

/** Small key/value stat tile used on the overview. */
export function StatTile({ label, value, icon, href, tone = "brand" }: { label: string; value: ReactNode; icon: ReactNode; href?: string; tone?: "brand" | "danger" | "success" | "warning" }) {
  const toneClass = { brand: "bg-brand/8 text-brand", danger: "bg-danger/8 text-danger", success: "bg-success/10 text-[#15803d]", warning: "bg-warning/12 text-[#a16207]" }[tone];
  const body = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block truncate text-lg font-extrabold text-ink">{value}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft";
  return href ? (
    <Link href={href} className={cn(cls, "transition hover:border-brand/40 hover:shadow-card")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Inline notice banner (info / warning / danger / success). */
export function Notice({ tone = "info", title, children, action }: { tone?: "info" | "warning" | "danger" | "success"; title: string; children?: ReactNode; action?: ReactNode }) {
  const styles = {
    info: "border-brand/25 bg-brand/5",
    warning: "border-warning/40 bg-warning/8",
    danger: "border-danger/30 bg-danger/5",
    success: "border-success/35 bg-success/8",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", styles)}>
      <div className="min-w-0">
        <p className="font-bold text-ink">{title}</p>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
