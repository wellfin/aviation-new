import { Flag } from "@/components/ui/Flag";
import Image from "next/image";
import { Search } from "lucide-react";
import type { Airport } from "@/lib/types";


/** Photo hero with IATA/ICAO chips, airport name, region + flag and the global search bar. */
export function AirportHero({ airport }: { airport: Airport }) {
  return (
    <section className="relative mt-4 overflow-hidden bg-navy-900 text-white" aria-labelledby="airport-title">
      <Image src={airport.image} alt={`${airport.name} terminal`} fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-navy-900/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/30 to-transparent" />
      <div className="container-site relative flex min-h-[288px] flex-col justify-end gap-6 pt-24 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {airport.iata && (
              <span className="rounded-md border border-brand-cyan/35 bg-brand-cyan/20 px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-cyan">{airport.iata}</span>
            )}
            <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-[11px] text-white/80">{airport.icao}</span>
          </div>
          <h1 id="airport-title" className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.5px] md:text-[36px]">
            {airport.name}
          </h1>
          <p className="mt-1 text-sm text-white/75">
            {airport.region}, {airport.country} <Flag code={airport.countryCode} className="ml-1" />
          </p>
        </div>

        <form action="/search" method="get" role="search" className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-[800px] lg:pb-2">
          <label htmlFor="hero-search" className="sr-only">
            Search airports
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink" aria-hidden />
            <input
              id="hero-search"
              name="q"
              type="search"
              required
              placeholder="ENTER ICAO, IATA, AIRPORT NAME, CITY"
              className="h-[52px] w-full rounded-full bg-white pr-5 pl-11 text-sm font-medium text-ink outline-none placeholder:text-ink focus:ring-3 focus:ring-brand-cyan/40"
            />
          </div>
          <button type="submit" className="bg-brand-gradient h-[52px] rounded-full px-10 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 sm:w-[220px]">
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
