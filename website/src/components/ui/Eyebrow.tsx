import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rounded "• LABEL" pill used above section headings. */
export function Eyebrow({ children, tone = "navy", className }: { children: ReactNode; tone?: "navy" | "brand" | "light"; className?: string }) {
  const tones = {
    navy: "bg-navy-900/6 border-navy-900/12 text-navy-900",
    brand: "bg-brand/8 border-brand/20 text-brand",
    light: "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan",
  } as const;
  const dot = { navy: "bg-navy-900", brand: "bg-brand", light: "bg-brand-cyan" } as const;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[1.2px]", tones[tone], className)}>
      <span className={cn("size-1.5 rounded-full", dot[tone])} aria-hidden />
      {children}
    </span>
  );
}
