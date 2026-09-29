import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { AirportCard } from "@/components/airport/AirportCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Pagination } from "@/components/ui/Pagination";
import { listAirports } from "@/lib/data/airports";
import { getAdvertisement } from "@/lib/data/content";
import { cn, firstParam, formatNumber, toInt } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Airport Directory — FBOs, Handlers & Airport Data Worldwide",
  description:
    "Search airports by ICAO, IATA, name or city. Find FBOs, ground handlers, fuel and trip support providers plus runways, frequencies and live weather for every airport.",
};

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"] as const;

export default async function AirportsPage({ searchParams }: PageProps<"/airports">) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();
  const continentParam = firstParam(sp.continent);
  const continent = CONTINENTS.find((c) => c === continentParam);
  const country = firstParam(sp.country)?.trim() || undefined;
  const page = toInt(sp.page, 1);

  const [result, ad] = await Promise.all([listAirports({ q, continent, country, page, pageSize: 12 }), getAdvertisement("header-banner")]);
  const filtered = Boolean(q || continent || country);

  const chipHref = (c?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (country) p.set("country", country);
    if (c) p.set("continent", c);
    const qs = p.toString();
    return qs ? `/airports?${qs}` : "/airports";
  };

  return (
    <>
      <AdBanner ad={ad} className="pt-4" />

      <section className="bg-hero-navy mt-4 text-white">
        <div className="container-site py-12 md:py-16">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Airports" }]} />
          <Eyebrow tone="light" className="mt-6">
            Airport Directory
          </Eyebrow>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.6px] md:text-[42px] md:leading-[52px]">Find an Airport</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/65 md:text-base">
            Search by ICAO or IATA code, airport name or city to see service providers, runways, frequencies and live weather.
          </p>

          <form action="/airports" method="get" role="search" className="mt-8 flex flex-col gap-3 md:flex-row">
            <label htmlFor="airport-q" className="sr-only">
              Search airports
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="airport-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="ENTER ICAO, IATA, AIRPORT NAME, CITY"
                className="h-[54px] w-full rounded-full bg-white pr-5 pl-11 text-sm font-medium text-ink uppercase outline-none placeholder:text-ink/70 focus:ring-3 focus:ring-brand-cyan/40"
              />
            </div>
            <label htmlFor="airport-continent" className="sr-only">
              Continent
            </label>
            <select
              id="airport-continent"
              name="continent"
              defaultValue={continent ?? ""}
              className="h-[54px] rounded-full bg-white px-5 text-sm font-medium text-ink outline-none focus:ring-3 focus:ring-brand-cyan/40 md:w-56"
            >
              <option value="">All continents</option>
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {country && <input type="hidden" name="country" value={country} />}
            <button type="submit" className="bg-brand-gradient h-[54px] rounded-full px-12 text-sm font-semibold text-white transition hover:brightness-110">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="container-site py-10 md:py-14" aria-labelledby="airport-results">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="airport-results" className="text-2xl font-extrabold text-ink md:text-[30px]">
              {filtered ? "Search Results" : "All Airports"}
            </h2>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {formatNumber(result.total)} {result.total === 1 ? "airport" : "airports"}
              {q && (
                <>
                  {" "}
                  matching <span className="font-semibold text-ink">“{q}”</span>
                </>
              )}
              {continent && <> in {continent}</>}
              {country && <> · country {country.toUpperCase()}</>}
            </p>
          </div>
          <nav aria-label="Filter by continent" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {[undefined, ...CONTINENTS].map((c) => {
              const active = c === continent;
              return (
                <Link
                  key={c ?? "all"}
                  href={chipHref(c)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                    active ? "bg-brand-gradient border-transparent text-white" : "border-line bg-white text-muted hover:border-brand/40 hover:text-brand",
                  )}
                >
                  {c ?? "All"}
                </Link>
              );
            })}
          </nav>
        </div>

        {result.items.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((a) => (
              <li key={a.icao} className="flex">
                <AirportCard airport={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-[20px] border border-dashed border-line bg-white px-6 py-16 text-center">
            <p className="text-4xl" aria-hidden>
              🛬
            </p>
            <h3 className="mt-3 text-lg font-bold text-ink">No airports found</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              We couldn&apos;t find an airport matching your search. Check the ICAO/IATA code or try a city name instead.
            </p>
            <Link href="/airports" className="bg-brand-gradient mt-6 inline-flex h-10 items-center rounded-full px-6 text-sm font-semibold text-white hover:brightness-110">
              Clear search
            </Link>
          </div>
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          basePath="/airports"
          params={{ q: q || undefined, continent, country }}
          className="mt-10"
        />
      </section>

      <AdBanner ad={ad} className="pb-12" />
    </>
  );
}
