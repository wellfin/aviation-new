import { Flag } from "@/components/ui/Flag";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Airport } from "@/lib/types";

/** Airport tile in the "World's Busiest Hubs" style: photo with code chips, name, country and service tags. */
export function AirportCard({ airport }: { airport: Airport }) {
  const href = `/airports/${airport.icao.toLowerCase()}`;
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[20px] border border-brand/10 bg-white transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-[180px] overflow-hidden bg-navy-900">
        <Image
          src={airport.image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 450px"
          className="object-cover opacity-85 transition duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/75 to-navy-900/0 to-55%" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {airport.iata && (
            <span className="rounded-lg border border-brand-cyan/35 bg-brand-cyan/20 px-2.5 py-1 font-mono text-xs leading-4 font-extrabold text-brand-cyan">{airport.iata}</span>
          )}
          <span className="rounded-md bg-white/12 px-2 py-0.5 font-mono text-[10px] leading-[15px] text-white/75">{airport.icao}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <h3 className="text-sm leading-5 font-bold text-ink">
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand">
            {airport.shortName}
          </Link>
        </h3>
        <p className="pt-0.5 text-xs leading-4 text-subtle">
          <Flag code={airport.countryCode} /> {airport.city}, {airport.country}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <ul className="flex flex-wrap gap-1.5" aria-label="Available services">
            {airport.serviceTags.map((tag) => (
              <li key={tag} className="rounded-full bg-brand/8 px-2 py-0.5 text-[9px] leading-[13.5px] font-semibold text-brand">
                {tag}
              </li>
            ))}
          </ul>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-brand" aria-hidden>
            View <ArrowRight className="size-2.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
