import type { Provider } from "@/lib/types";
import { CARD, CARD_TITLE } from "../styles";
import { isCharter } from "../profile-config";

/**
 * About card with the company description only (Figma detail pages, every plan). Charter operators /
 * brokers get the tall card drawn for them.
 */
export function AboutTab({ provider }: { provider: Provider }) {
  const charter = isCharter(provider);
  return (
    <section className={`${CARD} p-6 ${charter ? "sm:min-h-[600px]" : ""}`} aria-labelledby="about-heading">
      <h2 id="about-heading" className={CARD_TITLE}>
        About {provider.name}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-sm leading-[22.75px] text-muted">
        {provider.about.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
    </section>
  );
}
