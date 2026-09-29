import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Crosshair, Map } from "lucide-react";
import { ABOUT_STATS, CAPABILITIES, SERVICE_CHIPS, WHY_CHOOSE_US } from "@/components/company/about-data";
import { PageShell } from "@/components/company/PageShell";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Us — The World's Most Trusted Aviation Directory",
  description:
    "Founded in 2018 by aviation professionals, Global Aviation Services Directory connects pilots, operators and dispatchers with 20,000+ verified service providers in 180+ countries.",
};

function SectionEyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[1.2px] text-[#00a3d9] uppercase">
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <PageShell
      hero={
        <>
          <section className="bg-header-gradient relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(47,128,237,0.22),transparent_55%)]" />
            <div className="relative container-site grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-12 lg:py-20">
              <div>
                <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[1.2px] text-brand-cyan uppercase">
                  About Us
                </span>
                <h1 className="mt-6 text-[36px] leading-[1.15] font-extrabold tracking-[-1.2px] text-white sm:text-[48px]">
                  The World&rsquo;s Most Trusted <span className="text-brand-gradient block">Aviation Directory</span>
                </h1>
                <p className="mt-6 max-w-[600px] text-base leading-7 text-white/70 sm:text-[17px] sm:leading-[30px]">
                  Founded in 2018 by aviation professionals, Global Aviation Services Directory bridges the gap between aviation businesses and the 2.4
                  million professionals who need them — every single day. From a single-pilot operator planning a first trip into a new region to an
                  airline ops centre sourcing handling across a network, we make finding the right provider fast, reliable and verified.
                </p>
              </div>
              <div className="relative aspect-[672/360] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <Image
                  src="/images/company/about-terminal.jpg"
                  alt="Busy international airport terminal concourse"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 672px"
                  className="object-cover opacity-85"
                />
              </div>
            </div>
          </section>

          <section aria-label="Key figures" className="bg-navy-900 py-4">
            <ul className="container-site grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-8">
              {ABOUT_STATS.map((s) => (
                <li key={s.label} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-4 sm:justify-center sm:gap-4 sm:px-6 sm:py-5">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", s.tone)} aria-hidden>
                    <s.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-base leading-6 font-extrabold text-ink sm:text-lg">{s.value}</span>
                    <span className="block text-xs text-subtle">{s.label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      }
    >
      <div className="container-site">
        <section className="grid gap-6 pt-16 md:grid-cols-2" aria-label="Mission and vision">
          <article className="rounded-2xl border border-brand-cyan/10 bg-gradient-to-br from-navy-800 to-[#0e3060] p-8 text-white shadow-card sm:p-10">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand/25 text-brand-cyan" aria-hidden>
              <Crosshair className="size-6" />
            </span>
            <h2 className="mt-8 text-xl font-bold">Our Mission</h2>
            <p className="mt-4 text-[15px] leading-6 text-white/65">
              To be the definitive global resource for aviation services — empowering every aviation professional, from single-pilot operators to
              multinational airlines, to discover, connect, and transact with confidence anywhere in the world.
            </p>
          </article>
          <article className="rounded-2xl border border-brand-cyan/10 bg-gradient-to-br from-navy-900 to-navy-950 p-8 text-white shadow-card sm:p-10">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan" aria-hidden>
              <Map className="size-6" />
            </span>
            <h2 className="mt-8 text-xl font-bold">Our Vision</h2>
            <p className="mt-4 text-[15px] leading-6 text-white/65">
              A world where every aviation professional, regardless of location, has instant access to verified, accurate, and comprehensive aviation
              services data — making every flight safer, more efficient, and more commercially successful.
            </p>
          </article>
        </section>

        <section className="pt-20 text-center" aria-labelledby="capabilities-heading">
          <SectionEyebrow>Platform Capabilities</SectionEyebrow>
          <h2 id="capabilities-heading" className="mt-5 text-[26px] font-extrabold tracking-[-0.6px] text-ink sm:text-[30px]">
            Everything Aviation Professionals Need
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] text-[15px] leading-6 text-muted">
            From pre-flight planning to post-flight analysis — one platform covering every aspect of global aviation services.
          </p>
          <ul className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <li key={c.title} className="rounded-2xl border border-line/60 bg-white p-6 shadow-soft">
                <span className="text-[26px] leading-none" aria-hidden>
                  {c.emoji}
                </span>
                <h3 className="mt-5 text-[15px] font-bold text-ink">{c.title}</h3>
                <p className="mt-3 text-[13px] leading-5 text-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative mt-16 overflow-hidden rounded-2xl border border-brand-cyan/12 bg-gradient-to-br from-navy-900 to-[#0e3060] p-8 sm:p-10" aria-labelledby="why-heading">
          <Image src="/images/company/why-choose-bg.png" alt="" fill sizes="1352px" className="object-cover opacity-10" />
          <div className="relative">
            <h2 id="why-heading" className="text-center text-[24px] font-extrabold tracking-[-0.6px] text-white sm:text-[30px]">
              Why Aviation Professionals Choose Us
            </h2>
            <ol className="mt-8 grid list-decimal gap-x-12 gap-y-6 pl-5 text-sm leading-[22px] text-white marker:text-brand-cyan md:grid-cols-2 lg:grid-cols-3">
              {WHY_CHOOSE_US.map((reason) => (
                <li key={reason} className="pl-1">
                  {reason}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pt-20 text-center" aria-labelledby="services-heading">
          <h2 id="services-heading" className="text-[26px] font-extrabold tracking-[-0.6px] text-ink sm:text-[30px]">
            Every Aviation Service, One Platform
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SERVICE_CHIPS.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="flex h-9 items-center justify-center rounded-lg bg-navy-950 px-3 text-center text-xs font-medium text-white transition hover:bg-navy-800"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="pt-20 text-center" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-[26px] font-extrabold tracking-[-0.6px] text-ink">
            Ready to get started?
          </h2>
          <p className="mt-3 text-[15px] text-muted">Join 2.4 million aviation professionals who rely on the Global Aviation Services Directory every day.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/signup" className="h-[50px] px-8 text-[15px]">
              Create Free Account →
            </ButtonLink>
            <ButtonLink href="/request-demo" variant="outline" className="h-[50px] px-8 text-[15px]">
              Request Demo
            </ButtonLink>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
