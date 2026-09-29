import { Eyebrow } from "@/components/ui/Eyebrow";
import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  { emoji: "✈️", text: "Discover airports, FBOs & handlers globally" },
  { emoji: "⛽", text: "Compare fuel prices across 12,000+ airports" },
  { emoji: "📋", text: "Live NOTAMs, METAR & TAF in one place" },
  { emoji: "🏆", text: "List your business to 2.4M+ monthly visitors" },
] as const;

const STATS = [
  { value: "50K+", label: "Providers" },
  { value: "180", label: "Countries" },
  { value: "12K+", label: "Airports" },
] as const;

/** Glowing "radar blip" dots scattered over the panel (positions from the design, as % of the panel). */
const BLIPS = [
  { left: "20%", top: "38%", opacity: 1 },
  { left: "55%", top: "25%", opacity: 0.82 },
  { left: "72%", top: "55%", opacity: 0.61 },
  { left: "35%", top: "65%", opacity: 0.94 },
  { left: "80%", top: "32%", opacity: 0.69 },
] as const;

/** Left-hand navy "Aviation Command Centre" panel shared by every auth screen (desktop only). */
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(157deg,#071423_8%,#0b1f3a_46%,#0e3060_92%)] text-white lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(0,194,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div aria-hidden className="absolute -top-15 -left-15 size-[300px] rounded-full bg-[radial-gradient(circle,rgba(47,128,237,0.06)_0%,transparent_70%)]" />
      <div aria-hidden className="absolute top-[62%] left-[56%] size-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,194,255,0.08)_0%,transparent_70%)]" />
      {BLIPS.map((b) => (
        <span
          key={`${b.left}-${b.top}`}
          aria-hidden
          className="absolute size-2 rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(0,194,255,0.7)] motion-safe:animate-pulse"
          style={{ left: b.left, top: b.top, opacity: b.opacity }}
        />
      ))}

      <div className="relative flex flex-1 flex-col p-10">
        <Logo size="lg" />

        <div className="flex flex-1 flex-col justify-center py-8">
          <div>
            <Eyebrow tone="light" className="border-brand-cyan/22 bg-brand-cyan/12">
              Aviation Command Centre
            </Eyebrow>
          </div>
          <h2 className="mt-6 text-4xl leading-[45px] font-extrabold tracking-[-0.72px]">
            The World&apos;s Most
            <br />
            <span className="text-brand-gradient">Trusted Aviation</span>
            <br />
            Directory
          </h2>
          <p className="mt-5 max-w-[640px] text-sm leading-[22.75px] text-white/60">
            50,000+ verified service providers across 180 countries. Trusted by pilots, operators, and FBOs worldwide.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-white/72">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/7">
                  {f.emoji}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col-reverse items-center text-center">
              <dt className="mt-0.5 text-[11px] leading-[16.5px] text-white/40">{s.label}</dt>
              <dd className="text-brand-gradient text-lg leading-7 font-extrabold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
