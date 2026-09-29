import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, tone = "light", className }: { items: Crumb[]; tone?: "light" | "dark"; className?: string }) {
  const base = tone === "light" ? "text-white/60" : "text-muted";
  const current = tone === "light" ? "text-brand-cyan" : "text-brand";
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-2 text-sm", base, className)}>
      {items.map((c, i) => (
        <Fragment key={`${c.label}-${i}`}>
          {i > 0 && <span aria-hidden>/</span>}
          {c.href && i < items.length - 1 ? (
            <Link href={c.href} className="hover:text-white hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? current : undefined} aria-current={i === items.length - 1 ? "page" : undefined}>
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
