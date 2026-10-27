"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Flag } from "@/components/ui/Flag";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "../Dialog";
import { CARD, CARD_TITLE } from "../styles";

/** Five rows of three tiles on the tab; the rest open in a popup. */
const VISIBLE = 15;

type AirportRef = Provider["airports"][number];

function AirportTile({ a, primary }: { a: AirportRef; primary?: boolean }) {
  return (
    <Link
      href={`/airports/${a.icao.toLowerCase()}`}
      title={a.name}
      className={cn(
        "group flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition",
        primary ? "bg-brand-gradient text-white" : "border border-brand/15 bg-white text-brand hover:border-brand/40 hover:bg-brand/4",
      )}
    >
      <span className="font-mono text-[13px] font-bold">{a.icao}</span>
      <span className="sr-only">— {a.name}</span>
      <ChevronRight className={cn("size-3.5 shrink-0 transition group-hover:translate-x-0.5", primary ? "text-white" : "text-subtle")} aria-hidden />
    </Link>
  );
}

/** Airport Coverage (Figma): ICAO tiles, three across, at most five rows; "+N more locations worldwide" opens the full list. */
export function AirportsTab({ provider }: { provider: Provider }) {
  const [open, setOpen] = useState(false);
  const airports = provider.airports;
  const count = provider.locationsLabel ?? `${airports.length} ${airports.length === 1 ? "Location" : "Locations"}`;
  // The network size from the listing's label ("200+ Global Locations") when it's larger than the airports listed.
  const total = Math.max(Number.parseInt(provider.locationsLabel ?? "", 10) || 0, airports.length);
  const visible = airports.slice(0, VISIBLE);
  const more = total - visible.length;

  return (
    <section className={`${CARD} p-6`} aria-labelledby="airports-heading">
      <h2 id="airports-heading" className={CARD_TITLE}>
        Airport Coverage ({count})
      </h2>
      {airports.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No airports listed yet.</p>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visible.map((a, i) => (
              <li key={a.icao}>
                <AirportTile a={a} primary={i === 0} />
              </li>
            ))}
          </ul>
          {more > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className="mt-2.5 w-full rounded-xl border border-dashed border-brand/30 bg-brand/4 px-3 py-3 text-center text-sm font-semibold text-brand transition hover:bg-brand/8"
            >
              +{more} more locations worldwide
            </button>
          )}
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Airport Coverage" subtitle={`${provider.name} · ${count}`} className="max-w-[720px]">
        <ul className="grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2">
          {airports.map((a) => (
            <li key={a.icao}>
              <Link href={`/airports/${a.icao.toLowerCase()}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm transition hover:border-brand/40 hover:bg-brand/4">
                <span className="font-mono text-[13px] font-bold text-brand">{a.icao}</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  <Flag code={a.countryCode} /> {a.name}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        {total > airports.length && (
          <p className="mt-4 text-xs text-muted">
            {airports.length} of {total}+ locations are listed here. Contact {provider.name} for the full network.
          </p>
        )}
      </Dialog>
    </section>
  );
}
