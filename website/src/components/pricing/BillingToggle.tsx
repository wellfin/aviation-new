import Link from "next/link";
import { cn } from "@/lib/utils";

export type Billing = "monthly" | "yearly";

/** Monthly / yearly switch. Link based so the selection lives in the URL (?billing=). */
export function BillingToggle({ billing, savingsLabel }: { billing: Billing; savingsLabel?: string }) {
  const options: Array<{ value: Billing; label: string }> = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];
  return (
    <nav aria-label="Billing period" className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 p-1">
      {options.map((o) => {
        const active = o.value === billing;
        return (
          <Link
            key={o.value}
            href={o.value === "yearly" ? "/pricing" : "/pricing?billing=monthly"}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-5 text-sm font-semibold transition",
              active ? "bg-brand-gradient text-white shadow-[0_4px_14px_rgba(47,128,237,0.35)]" : "text-white/70 hover:text-white",
            )}
          >
            {o.label}
            {o.value === "yearly" && savingsLabel && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-white/20 text-white" : "bg-success/15 text-success")}>{savingsLabel}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
