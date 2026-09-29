import type { Provider } from "@/lib/types";
import { CARD, CARD_TITLE } from "../styles";
import { TIER_RULES, isCharter } from "../profile-config";

export function AboutTab({ provider }: { provider: Provider }) {
  const facts = [
    { label: "Headquarters", value: `${provider.city}, ${provider.country}` },
    provider.foundedYear ? { label: "Founded", value: String(provider.foundedYear) } : null,
    provider.employees ? { label: "Employees", value: provider.employees } : null,
    isCharter(provider) && provider.fleet.length > 0 ? { label: "Fleet Size", value: `${provider.fleet.length} aircraft` } : null,
    provider.locationsLabel ? { label: "Coverage", value: provider.locationsLabel } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
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
        {facts.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl border border-brand/10 bg-brand/4 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-[0.6px] text-subtle uppercase">{f.label}</dt>
                <dd className="mt-0.5 text-sm font-bold text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
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
