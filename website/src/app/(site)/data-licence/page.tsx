import type { Metadata } from "next";
import { KeyRound, Gauge, FileJson, ShieldCheck } from "lucide-react";
import { DataLicenceForm } from "@/components/company/DataLicenceForm";
import { DATA_STATS, DATASETS } from "@/components/company/datasets";
import { PageShell } from "@/components/company/PageShell";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Enterprise Aviation Data Licensing",
  description:
    "License airport, provider, weather, NOTAM, runway and fuel price data via REST API or bulk export. Trusted by airlines, software companies and government agencies.",
};

const API_FEATURES = [
  { icon: KeyRound, title: "API key authentication", text: "Every request is authenticated with a per-environment key sent in the Authorization header." },
  { icon: FileJson, title: "JSON, CSV & XML", text: "REST endpoints return JSON; bulk exports are delivered as CSV, JSON or XML via secure download." },
  { icon: Gauge, title: "Rate limits by tier", text: "Licences include generous rate limits, with burst capacity and WebSocket streams for live feeds." },
  { icon: ShieldCheck, title: "99.9% uptime SLA", text: "Enterprise licences carry an uptime SLA, versioned endpoints and 12 months' deprecation notice." },
] as const;

const SAMPLE_RESPONSE = `curl https://api.gasdirectory.aero/v1/airports/EGLL \\
  -H "Authorization: Bearer $GAS_API_KEY"

{
  "icao": "EGLL",
  "iata": "LHR",
  "name": "London Heathrow Airport",
  "country": "GB",
  "elevationFt": 83,
  "timezone": "Europe/London",
  "runways": 2,
  "providers": 64
}`;

export default function DataLicencePage() {
  return (
    <PageShell
      hero={
        <>
          <section className="bg-header-gradient relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(47,128,237,0.25),transparent_60%)]" />
            <div className="relative container-site py-16 text-center sm:py-20">
              <h1 className="text-[36px] leading-[1.15] font-extrabold tracking-[-1.2px] text-white sm:text-[48px]">
                Enterprise Aviation <span className="text-brand-gradient block">Data Licensing</span>
              </h1>
              <p className="mx-auto mt-6 max-w-[540px] text-base leading-7 text-white/65 sm:text-lg">
                Power your aviation products and services with the world&rsquo;s most comprehensive and accurate aviation data. Trusted by airlines,
                software companies, and government agencies globally.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="#request-data" className="h-[52px] px-7 text-base">
                  Request Data →
                </ButtonLink>
                <ButtonLink href="#api-docs" variant="ghost-light" className="h-[52px] border border-white/20 bg-transparent px-6 text-base">
                  API Docs
                </ButtonLink>
              </div>
            </div>
          </section>
          <section aria-label="Data coverage" className="border-t border-white/5 bg-navy-900">
            <dl className="container-site grid grid-cols-2 gap-y-6 py-6 lg:grid-cols-4">
              {DATA_STATS.map((s) => (
                <div key={s.label} className="flex flex-col-reverse items-center text-center">
                  <dt className="mt-1 text-xs text-white/50">{s.label}</dt>
                  <dd className="text-xl font-extrabold text-brand">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      }
    >
      <div className="container-site">
        <section className="pt-12 text-center" aria-labelledby="datasets-heading">
          <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3.5 py-1.5 text-xs font-bold tracking-[1.2px] text-[#00a3d9] uppercase">
            Available Datasets
          </span>
          <h2 id="datasets-heading" className="mt-5 text-[26px] font-extrabold tracking-[-0.6px] text-ink sm:text-[30px]">
            Aviation Data You Can Build On
          </h2>
          <p className="mx-auto mt-3 max-w-[500px] text-sm leading-5 text-muted">
            All datasets are available via REST API and bulk export. Customise your licence to include only the data you need.
          </p>
          <ul className="mt-10 grid gap-5 text-left md:grid-cols-2 lg:grid-cols-3">
            {DATASETS.map((d) => (
              <li key={d.id} className="flex flex-col rounded-2xl border border-line/60 bg-white p-6 shadow-soft">
                <span className="text-[28px] leading-none" aria-hidden>
                  {d.emoji}
                </span>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-ink">{d.name}</h3>
                  <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.6px] text-[#00a3d9] uppercase">
                    {d.frequency}
                  </span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-[22px] text-muted">{d.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  <span>{d.volume} ·</span>
                  {d.formats.map((f) => (
                    <span key={f} className="rounded-md bg-brand/8 px-2 py-0.5 font-mono text-[10px] text-brand">
                      {f}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 px-6 py-10 text-center sm:px-10" aria-labelledby="custom-heading">
          <h2 id="custom-heading" className="text-2xl font-bold text-white">
            Need a Custom Data Package?
          </h2>
          <p className="mx-auto mt-3 max-w-[1080px] text-base leading-6 text-white/60">
            We work with airlines, government agencies, and aviation software companies to build bespoke data licence packages. Talk to our data team
            today.
          </p>
          <ButtonLink href="/contact" className="mt-6 h-[52px] w-full max-w-[288px] text-base">
            Talk to Sales
          </ButtonLink>
        </section>

        <div className="mt-16 grid items-start gap-8 lg:grid-cols-2">
          <section id="api-docs" className="min-w-0 scroll-mt-24" aria-labelledby="api-heading">
            <h2 id="api-heading" className="text-2xl font-extrabold tracking-[-0.4px] text-ink">
              API Documentation
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-muted">
              Every licensed dataset is exposed through a versioned REST API at <code className="font-mono text-sm break-all text-ink">api.gasdirectory.aero/v1</code>.
              Full reference documentation, SDKs and a sandbox key are issued with your licence.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {API_FEATURES.map((f) => (
                <li key={f.title} className="rounded-xl border border-line bg-white p-4">
                  <f.icon className="size-5 text-brand" aria-hidden />
                  <h3 className="mt-3 text-sm font-bold text-ink">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-sm font-bold text-ink">Endpoints</h3>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {DATASETS.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <code className="font-mono text-xs text-ink">{d.endpoint}</code>
                  <span className="text-xs text-subtle">{d.name}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-sm font-bold text-ink">Example request</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-navy-950 p-5 font-mono text-xs leading-5 text-[#cbd5e1]">
              <code>{SAMPLE_RESPONSE}</code>
            </pre>
          </section>

          <section id="request-data" className="scroll-mt-24 rounded-3xl border border-line/60 bg-white p-6 shadow-card sm:p-8" aria-labelledby="request-heading">
            <h2 id="request-heading" className="text-xl font-bold text-ink">
              Request Data
            </h2>
            <p className="mt-2 mb-6 text-sm text-muted">Tell us which datasets you need and we&rsquo;ll send licence options, pricing and sample files.</p>
            <DataLicenceForm datasets={DATASETS.map((d) => ({ id: d.id, name: d.name }))} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}
