import { Download } from "lucide-react";
import type { Brochure } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CARD, TILE } from "../styles";

export function BrochureTab({ brochures }: { brochures: Brochure[] }) {
  return (
    <section className={`${CARD} p-6`} aria-labelledby="brochure-heading">
      <h2 id="brochure-heading" className="text-xl font-bold text-ink md:text-2xl">
        Brochure
      </h2>
      {brochures.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No brochures have been published yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {brochures.map((b, i) => (
            <li key={b.title}>
              <a href={b.url} download className={cn(TILE, "group", i === 0 ? "bg-brand-gradient" : "bg-navy-900")}>
                <span className="flex items-center gap-2 text-base font-bold uppercase md:text-lg">
                  <Download className="size-4 shrink-0 opacity-80" aria-hidden />
                  <span className="line-clamp-1">{b.title}</span>
                </span>
                <span className="text-[11px] leading-4 font-semibold tracking-[0.6px] text-white/70">
                  {b.fileType} · {b.sizeLabel}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
