import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CARD, CARD_TITLE } from "../styles";

/** Airport Coverage (Figma): ICAO tiles, three across, then "+N more locations worldwide" when the network is larger. */
export function AirportsTab({ provider }: { provider: Provider }) {
  const count = provider.locationsLabel ?? `${provider.airports.length} ${provider.airports.length === 1 ? "Location" : "Locations"}`;
  const total = Number.parseInt(provider.locationsLabel ?? "", 10);
  const more = Number.isFinite(total) ? total - provider.airports.length : 0;
  return (
    <section className={`${CARD} p-6`} aria-labelledby="airports-heading">
      <h2 id="airports-heading" className={CARD_TITLE}>
        Airport Coverage ({count})
      </h2>
      {provider.airports.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No airports listed yet.</p>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {provider.airports.map((a, i) => (
              <li key={a.icao}>
                <Link
                  href={`/airports/${a.icao.toLowerCase()}`}
                  title={a.name}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition",
                    i === 0 ? "bg-brand-gradient text-white" : "border border-brand/15 bg-white text-brand hover:border-brand/40 hover:bg-brand/4",
                  )}
                >
                  <span className="font-mono text-[13px] font-bold">{a.icao}</span>
                  <span className="sr-only">— {a.name}</span>
                  <ChevronRight className={cn("size-3.5 shrink-0 transition group-hover:translate-x-0.5", i === 0 ? "text-white" : "text-subtle")} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <p className="mt-2.5 rounded-xl border border-dashed border-brand/30 bg-brand/4 px-3 py-3 text-center text-sm font-semibold text-brand">
              +{more} more locations worldwide
            </p>
          )}
        </>
      )}
    </section>
  );
}
