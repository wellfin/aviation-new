import type { Metadata } from "next";
import Link from "next/link";
import { AdBanner } from "@/components/ads/AdBanner";
import { ContactForm } from "@/components/contact/ContactForm";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { MapEmbed } from "@/components/tools/MapEmbed";
import { orFallback } from "@/lib/data/safe";
import { getAdvertisement, listFaqs } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "Contact Us — Get In Touch",
  description: "Contact the Global Aviation Services Directory team for sales enquiries, partnership opportunities, technical support or press enquiries.",
};

const OFFICE = {
  email: "hello@gasdirectory.aero",
  phone: "+44 20 7946 0000",
  address: "Hangar 7, Aviation House, London W2 1RN",
  lat: 51.5154,
  lon: -0.1755,
};

const DETAILS = [
  { icon: "✉️", value: OFFICE.email, label: "Email", href: `mailto:${OFFICE.email}` },
  { icon: "📞", value: OFFICE.phone, label: "Call", href: `tel:${OFFICE.phone.replace(/\s/g, "")}` },
  { icon: "📍", value: OFFICE.address, label: "Map", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE.address)}` },
];

export default async function ContactPage() {
  const [faqs, banner] = await Promise.all([orFallback(listFaqs(), []), getAdvertisement("header-banner")]);

  return (
    <div className="bg-[#f7fafc]">
      <section className="bg-header-gradient px-4 py-12 text-center md:px-6">
        <h1 className="text-[34px] leading-10 font-extrabold tracking-[-0.72px] text-white md:text-[46px]">Get In Touch</h1>
      </section>

      <div className="mx-auto grid max-w-[1000px] gap-10 px-4 py-12 md:grid-cols-2 md:px-6">
        <div className="flex flex-col">
          <h2 className="text-2xl leading-8 font-bold text-ink">We&apos;d love to hear from you</h2>
          <p className="pt-4 text-base leading-6 text-muted">Reach out for sales enquiries, partnership opportunities, technical support, or press enquiries.</p>
          <ul className="flex flex-col gap-4 pt-6 pb-4">
            {DETAILS.map((d) => (
              <li key={d.label}>
                <a
                  href={d.href}
                  {...(d.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-center gap-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-base" aria-hidden>
                    {d.icon}
                  </span>
                  <span>
                    <span className="block text-sm leading-5 font-semibold text-ink group-hover:text-brand">{d.value}</span>
                    <span className="block text-xs leading-4 text-subtle">{d.label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <MapEmbed lat={OFFICE.lat} lon={OFFICE.lon} zoom={15} title={`Map showing ${OFFICE.address}`} className="h-[262px] rounded-[19px]" />
        </div>

        <div className="self-start rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:p-6">
          <ContactForm />
        </div>
      </div>

      {faqs.length > 0 && (
        <section aria-labelledby="contact-faq-title" className="mx-auto max-w-[1000px] px-4 pb-12 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
            <h2 id="contact-faq-title" className="text-2xl leading-8 font-bold text-ink">
              Frequently asked questions
            </h2>
            <Link href="/faq" className="text-sm font-semibold text-brand hover:underline">
              View all FAQs →
            </Link>
          </div>
          <FaqAccordion items={faqs.slice(0, 4)} defaultOpen={null} />
        </section>
      )}

      <AdBanner ad={banner} height="h-[72px] sm:h-[120px] md:h-[222px]" className="pb-9" />
    </div>
  );
}
