"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Flag } from "@/components/ui/Flag";
import { cn } from "@/lib/utils";

export const DIAL_CODES = [
  { country: "IN", name: "India", code: "+91" },
  { country: "GB", name: "United Kingdom", code: "+44" },
  { country: "US", name: "United States", code: "+1" },
  { country: "AE", name: "United Arab Emirates", code: "+971" },
  { country: "SA", name: "Saudi Arabia", code: "+966" },
  { country: "QA", name: "Qatar", code: "+974" },
  { country: "SG", name: "Singapore", code: "+65" },
  { country: "AU", name: "Australia", code: "+61" },
  { country: "DE", name: "Germany", code: "+49" },
  { country: "FR", name: "France", code: "+33" },
  { country: "CH", name: "Switzerland", code: "+41" },
  { country: "NL", name: "Netherlands", code: "+31" },
  { country: "ZA", name: "South Africa", code: "+27" },
  { country: "MX", name: "Mexico", code: "+52" },
  { country: "BR", name: "Brazil", code: "+55" },
  { country: "JP", name: "Japan", code: "+81" },
  { country: "IT", name: "Italy", code: "+39" },
  { country: "ES", name: "Spain", code: "+34" },
  { country: "LU", name: "Luxembourg", code: "+352" },
  { country: "MT", name: "Malta", code: "+356" },
  { country: "HK", name: "Hong Kong", code: "+852" },
  { country: "CN", name: "China", code: "+86" },
] as const;

/**
 * Country dial-code picker (flag + code + chevron) that sits beside a phone input.
 * A transparent native select overlays the visual so it stays keyboard and screen-reader friendly.
 * Submits the code itself, e.g. "+91".
 */
export function DialCodeSelect({ name = "dialCode", id, className }: { name?: string; id: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const current = DIAL_CODES[index];
  return (
    <div className={cn("relative flex h-12 w-[126px] shrink-0 items-center gap-3 rounded-xl border border-brand/20 bg-white pr-3 pl-2.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15", className)}>
      <Flag code={current.country} className="h-[15px] w-[22px]" />
      <span className="flex-1 text-[15px] text-subtle" aria-hidden>
        {current.code}
      </span>
      <ChevronDown className="size-3.5 text-subtle" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Country dialling code
      </label>
      <select
        id={id}
        name={name}
        value={current.code}
        onChange={(e) => setIndex(Math.max(0, DIAL_CODES.findIndex((d) => d.code === e.target.value)))}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {DIAL_CODES.map((d) => (
          <option key={d.country} value={d.code}>
            {d.name} ({d.code})
          </option>
        ))}
      </select>
    </div>
  );
}
