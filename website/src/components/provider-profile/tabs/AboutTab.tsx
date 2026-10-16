import type { Provider } from "@/lib/types";
import { CARD, CARD_TITLE } from "../styles";
import { TIER_RULES } from "../profile-config";

/** About card: the description only, as drawn on every plan; Ultra Pro adds the company video. */
export function AboutTab({ provider }: { provider: Provider }) {
  const showVideo = TIER_RULES[provider.tier].video && provider.videoUrl;

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} p-6`} aria-labelledby="about-heading">
        <h2 id="about-heading" className={CARD_TITLE}>
          About {provider.name}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-sm leading-[22.75px] text-muted">
          {provider.about.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>

      {showVideo && (
        <section aria-label={`${provider.name} video`} className="overflow-hidden rounded-[30px] bg-[#0d284e]">
          <iframe
            src={provider.videoUrl}
            title={`${provider.name} company video`}
            className="aspect-video w-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </section>
      )}
    </div>
  );
}
