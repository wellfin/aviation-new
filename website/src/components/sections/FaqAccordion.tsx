"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { FaqItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Numbered FAQ accordion used on the home and FAQ pages. */
export function FaqAccordion({ items, defaultOpen = 0 }: { items: FaqItem[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  if (items.length === 0) {
    return <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">No questions match your search.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        const num = String(i + 1).padStart(2, "0");
        return (
          <div
            key={item.id}
            className={cn("overflow-hidden rounded-2xl border bg-white transition", isOpen ? "border-brand/30 shadow-[0_4px_20px_rgba(47,128,237,0.08)]" : "border-line")}
          >
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                className="flex w-full items-center gap-4 px-6 py-5 text-left"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    isOpen ? "bg-brand-gradient text-white" : "bg-brand/8 text-brand",
                  )}
                >
                  {num}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink md:text-[15px]">{item.question}</span>
                <span className={cn("flex size-8 items-center justify-center rounded-lg", isOpen ? "bg-brand/10 text-brand" : "bg-surface text-subtle")}>
                  <ChevronDown className={cn("size-4 transition", isOpen && "rotate-180")} />
                </span>
              </button>
            </h3>
            {isOpen && (
              <div id={`${item.id}-panel`} className="border-t border-line/60 px-6 pt-5 pb-5 md:pl-[68px]">
                <p className="text-sm leading-6 text-ink/80">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
