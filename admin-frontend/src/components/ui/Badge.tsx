import type { ReactNode } from "react";
import type { ProviderTier } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "amber" | "slate" | "purple" | "red";

const TONES: Record<Tone, string> = {
  blue: "bg-[#eff6ff] text-[#3b82f6]",
  green: "bg-[#f0fdf4] text-[#16a34a]",
  orange: "bg-[#fff7ed] text-[#ea580c]",
  amber: "bg-warning/10 text-warning border border-warning/30",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-purple/10 text-purple",
  red: "bg-danger/10 text-danger",
};

export function Badge({ children, tone = "blue", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-[15px]", TONES[tone], className)}>{children}</span>;
}

const TIER_STYLES: Record<ProviderTier, { label: string; className: string }> = {
  ultra_pro: { label: "ULTRA PRO", className: "bg-[#342c00] text-[#ffd700] border border-[#ffd700]" },
  pro: { label: "PRO", className: "bg-black/60 text-brand-cyan border border-brand-cyan/60" },
  basic: { label: "BASIC", className: "bg-navy-900/70 text-brand border border-brand/40" },
};

export function TierBadge({ tier, className }: { tier: ProviderTier; className?: string }) {
  const t = TIER_STYLES[tier];
  return <span className={cn("inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-bold tracking-[0.55px] backdrop-blur-sm", t.className, className)}>{t.label}</span>;
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-[26px] items-center gap-1 rounded-full border border-success bg-[rgba(1,31,13,0.7)] px-2.5 text-[11px] tracking-[0.55px] font-bold text-success backdrop-blur-sm", className)}>
      ✓ VERIFIED
    </span>
  );
}

export const NEWS_CATEGORY_TONE: Record<string, Tone> = {
  "Industry News": "blue",
  "FBO Network": "green",
  Regulatory: "orange",
  Fuel: "amber",
  Technology: "purple",
  "Business Aviation": "slate",
};
