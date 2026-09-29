"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MoreServiceItem {
  slug: string;
  label: string;
  href: string;
}

/** "More Services" dropdown in the directory filter bar, listing the less common categories. */
export function MoreServicesMenu({ items, activeSlug }: { items: MoreServiceItem[]; activeSlug?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = items.find((i) => i.slug === activeSlug);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border border-brand/50 pr-2 pl-3 text-[15px] whitespace-nowrap text-white transition",
          active ? "bg-brand-gradient text-xs font-semibold" : "bg-navy-900 hover:bg-navy-800",
        )}
      >
        {active ? active.label : "More Services"}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 z-30 mt-2 flex w-[180px] flex-col items-stretch gap-2.5 rounded-[12px] bg-navy-900 p-3 shadow-[0_34px_24px_-12px_rgba(0,0,0,0.35)]"
        >
          {items.map((item, i) => (
            <Fragment key={item.slug}>
              {i > 0 && <span className="mx-auto h-px w-[119px] bg-white/15" aria-hidden />}
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={item.slug === activeSlug ? "page" : undefined}
                className={cn(
                  "rounded-full px-2 py-1 text-xs leading-4 font-semibold text-white transition",
                  item.slug === activeSlug ? "bg-brand-gradient border border-brand/50" : "hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
