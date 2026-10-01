import { Flag } from "@/components/ui/Flag";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Airport } from "@/lib/types";


function AirportCard({ airport }: { airport: Airport }) {
  return (
    <Link
      href={`/airports/${airport.icao.toLowerCase()}`}
      className="group flex flex-col overflow-hidden rounded-[16px] border border-line/70 bg-white transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative h-[180px] overflow-hidden bg-navy-900">
        <Image src={airport.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 450px" className="object-cover transition duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/10 via-navy-900/25 to-navy-900/70" aria-hidden />
        <span className="absolute top-3.5 right-3.5 rounded-lg border border-brand-cyan/25 bg-brand/25 px-2.5 py-1 text-xs font-semibold text-brand-cyan/90 backdrop-blur-sm">
          {airport.servicesCount} services
        </span>
        <span className="absolute bottom-3.5 left-3.5 flex items-center gap-2 font-mono">
          <span className="rounded-lg border border-brand-cyan/40 bg-brand-cyan/15 px-2 py-1 text-xs font-bold text-brand-cyan">{airport.iata}</span>
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/70">{airport.icao}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-4 pb-3.5">
        <h3 className="text-[15px] font-bold text-ink group-hover:text-brand">{airport.shortName}</h3>
        <p className="pt-0.5 text-xs text-subtle">
          <Flag code={airport.countryCode} /> {airport.country}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <ul className="flex flex-1 flex-wrap gap-1.5" aria-label="Available services">
            {airport.serviceTags.map((t) => (
              <li key={t} className="rounded-full bg-brand/8 px-2.5 py-0.5 text-[9px] font-semibold text-brand">
                {t}
              </li>
            ))}
          </ul>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
            View <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** "Featured Airports — World's Busiest Hubs" grid. */
export function FeaturedAirports({ airports }: { airports: Airport[] }) {
  return (
    <section aria-labelledby="featured-airports-heading" className="bg-[#f4f8fc] py-14 md:py-[72px]">
      <div className="container-site">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="bg-navy-900/5">Featured Airports</Eyebrow>
            <h2 id="featured-airports-heading" className="pt-4 text-[32px] leading-10 font-extrabold tracking-[-1px] text-ink md:text-[40px] md:leading-[50px]">
              World&rsquo;s Busiest Hubs
            </h2>
          </div>
          <Link href="/airports" className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-brand hover:underline">
            View All Airports <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {airports.length === 0 ? (
          <p className="mt-9 rounded-[16px] border border-line bg-white p-8 text-center text-sm text-muted">No featured airports right now — browse the full airport directory instead.</p>
        ) : (
          <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {airports.map((a) => (
              <AirportCard key={a.icao} airport={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
