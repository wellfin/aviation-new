import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { FaqItem } from "@/lib/types";

/** Home FAQ preview (first few questions) plus the "Still have questions?" support card. */
export function HomeFaq({ items }: { items: FaqItem[] }) {
  return (
    <section aria-labelledby="home-faq-heading" className="bg-[#f4f8fc] py-16 md:pt-20 md:pb-9">
      <div className="container-site max-w-[1148px]">
        <div className="text-center">
          <Eyebrow tone="brand">Frequently Asked Questions</Eyebrow>
          <h2 id="home-faq-heading" className="pt-5 text-[32px] leading-10 font-extrabold tracking-[-1px] text-ink md:text-[40px] md:leading-[50px]">
            Everything you need to know
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-base leading-[27px] text-muted">
            Can&rsquo;t find what you&rsquo;re looking for? Reach out to our{" "}
            <Link href="/contact" className="font-semibold text-brand hover:underline">
              support team
            </Link>{" "}
            — we typically respond within 2 hours.
          </p>
        </div>
        <div className="mt-10">
          <FaqAccordion items={items} />
        </div>
        <div className="mt-12 flex flex-col gap-5 rounded-[20px] bg-[linear-gradient(135deg,#0b1f3a_0%,#0a2d5e_100%)] px-6 py-6 text-white md:flex-row md:items-center md:px-8">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-cyan" aria-hidden>
            <MessageSquare className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">Still have questions?</p>
            <p className="pt-0.5 text-xs text-white/55">Our aviation experts are available 24/7 to help</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/faq" className="inline-flex h-10 items-center rounded-lg border border-white/12 bg-white/8 px-5 text-sm font-semibold transition hover:bg-white/12">
              Browse Help Centre
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center rounded-lg bg-brand-gradient px-5 text-sm font-semibold shadow-[0_4px_14px_rgba(47,128,237,0.35)] transition hover:brightness-110"
            >
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
