import { Flag } from "@/components/ui/Flag";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CARD, CARD_TITLE } from "../styles";

export function AirportsTab({ provider }: { provider: Provider }) {
  const count = provider.locationsLabel ?? `${provider.airports.length} ${provider.airports.length === 1 ? "Location" : "Locations"}`;
  return (
    <section className={`${CARD} p-6`} aria-labelledby="airports-heading">
      <h2 id="airports-heading" className={CARD_TITLE}>
        Airport Coverage ({count})
      </h2>
      {provider.airports.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No airports listed yet.</p>
      ) : (
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {provider.airports.map((a, i) => (
            <li key={a.icao}>
              <Link
                href={`/airports/${a.icao.toLowerCase()}`}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-3 py-2.5 transition",
                  i === 0 ? "bg-brand-gradient text-white" : "border border-brand/15 bg-white text-ink hover:border-brand/40 hover:bg-brand/4",
                )}
              >
                <span className={cn("font-mono text-[13px] font-bold", i === 0 ? "text-white" : "text-brand")}>{a.icao}</span>
                <span className={cn("min-w-0 flex-1 truncate text-xs", i === 0 ? "text-white/85" : "text-muted")}>
                  <Flag code={a.countryCode} /> {a.name}
                </span>
                <ChevronRight className={cn("size-3.5 shrink-0 transition group-hover:translate-x-0.5", i === 0 ? "text-white" : "text-subtle")} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
