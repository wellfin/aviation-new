import type { Provider } from "@/lib/types";
import { CARD, CARD_TITLE } from "../styles";

/** About card: the description only, as drawn on every plan (no video block in the design). */
export function AboutTab({ provider }: { provider: Provider }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Figma: a tall card (about 600 px) even when the description is short. */}
      <section className={`${CARD} p-6 sm:min-h-[600px]`} aria-labelledby="about-heading">
        <h2 id="about-heading" className={CARD_TITLE}>
          About {provider.name}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-sm leading-[22.75px] text-muted">
          {provider.about.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>

    </div>
  );
}
