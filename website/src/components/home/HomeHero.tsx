import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";

const HIGHLIGHTS = [
  { label: "Real-time Data", dot: "bg-success" },
  { label: "Global Coverage", dot: "bg-brand" },
  { label: "24×7 Operations", dot: "bg-warning" },
] as const;

/** Full-bleed sunset hero with the global airport / provider search. Submits GET /search?q=… */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 pt-14 pb-20 text-white md:pt-[78px] md:pb-[70px]">
      <Image src="/images/home/hero-bg.png" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[50%_40%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/25 via-navy-950/20 via-60% to-black/85" aria-hidden />
      <div className="container-site flex flex-col items-center text-center">
        <h1 className="max-w-[720px] text-[38px] leading-[46px] font-extrabold tracking-[-1.5px] sm:text-5xl sm:leading-[60px] md:text-[60px] md:leading-[75px]">
          Your Aviation Command Center
        </h1>
        <p className="pt-3 text-base leading-[25.6px] text-white/72">Search airports, FBOs, handlers &amp; services worldwide</p>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-5">
          {HIGHLIGHTS.map((h) => (
            <li key={h.label} className="flex items-center gap-1.5 text-sm font-medium text-white/75">
              <span className={`size-2 rounded-full ${h.dot}`} aria-hidden />
              {h.label}
            </li>
          ))}
        </ul>
        <form action="/search" method="get" role="search" className="mt-6 w-full max-w-[893px]">
          <div className="flex items-center gap-2 rounded-full bg-white py-[5px] pr-[5px] pl-4 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] sm:pl-5">
            <Search className="size-[18px] shrink-0 text-ink/50" aria-hidden />
            <label htmlFor="home-search" className="sr-only">
              Search airports, cities, IATA or ICAO codes
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              required
              autoComplete="off"
              placeholder="Search Airport, City, IATA (e.g.DXB) or ICAO (e.g. OMDB)..."
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/50 sm:text-lg"
            />
            <button
              type="submit"
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-navy-900 px-5 text-sm font-bold text-white transition hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan sm:px-6"
            >
              Search
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
