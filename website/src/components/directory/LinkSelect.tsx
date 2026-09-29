"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export interface LinkSelectOption {
  value: string;
  label: string;
  href: string;
}

/**
 * Pill-shaped native select whose options are URLs: choosing one navigates,
 * so sort/tier state lives in the (shareable) query string.
 */
export function LinkSelect({
  label,
  value,
  options,
  prefix,
  className,
}: {
  label: string;
  value: string;
  options: LinkSelectOption[];
  prefix?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative block shrink-0", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) startTransition(() => router.push(next.href, { scroll: false }));
        }}
        className="h-10 w-full cursor-pointer appearance-none rounded-full border border-brand/20 bg-white pr-9 pl-6 text-[15px] text-ink outline-none transition focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {prefix ? `${prefix}${o.label}` : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink" aria-hidden />
    </label>
  );
}
