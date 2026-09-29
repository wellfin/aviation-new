"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  label: string;
}

/**
 * Sticky table of contents. An IntersectionObserver watches every section and
 * highlights the first one currently inside the reading band of the viewport.
 */
export function LegalToc({ title, items, footer }: { title: string; items: TocItem[]; footer?: { label: string; href: string } }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const visible = new Set<string>();
    const order = items.map((i) => i.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      // The band between the sticky header and ~40% down the viewport counts as "reading".
      { rootMargin: "-96px 0px -60% 0px" },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={title} className="rounded-2xl border border-line/60 bg-white p-4 shadow-card">
      <p className="px-2 pb-3 text-xs font-semibold tracking-[1px] text-subtle uppercase">{title}</p>
      <ol className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item, i) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                  isActive ? "bg-brand/8 font-semibold text-brand" : "text-muted hover:bg-surface hover:text-ink",
                )}
              >
                <span className={cn("font-mono text-[10px]", isActive ? "text-brand" : "text-subtle")}>{String(i + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
      {footer && (
        <div className="mt-3 border-t border-line pt-4 text-center">
          <Link href={footer.href} className="text-sm font-semibold text-brand hover:underline">
            {footer.label}
          </Link>
        </div>
      )}
    </nav>
  );
}
