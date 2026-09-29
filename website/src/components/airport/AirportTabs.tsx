import Link from "next/link";
import { cn } from "@/lib/utils";
import { AIRPORT_TABS, airportHref, type AirportTab } from "./routes";

/** Navy pill tab bar; each tab is a shareable ?tab= link. `active` is undefined while a service list is shown. */
export function AirportTabs({ icao, active }: { icao: string; active?: AirportTab }) {
  return (
    <nav aria-label="Airport details" className="scrollbar-none overflow-x-auto rounded-xl border border-line bg-navy-900 p-1">
      <ul className="flex min-w-max items-stretch justify-between gap-1">
        {AIRPORT_TABS.map((t) => {
          const selected = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={airportHref(icao, { tab: t.key, hash: "airport-content" })}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-[37px] items-center rounded-xl px-4 text-[13px] whitespace-nowrap text-white transition",
                  selected ? "bg-brand-gradient font-extrabold" : "font-semibold hover:bg-white/10",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
