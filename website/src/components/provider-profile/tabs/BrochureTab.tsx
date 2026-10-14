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
                {/* Figma: the brochure name only; type and size stay available to screen readers. */}
                <span className="line-clamp-1 text-base font-bold uppercase md:text-lg">{b.title}</span>
                <span className="sr-only">
                  ({b.fileType}, {b.sizeLabel})
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
