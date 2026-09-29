import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Logo } from "@/components/ui/Logo";

const COLUMNS = [
  {
    title: "Directory",
    links: [
      { label: "Service Providers", href: "/directory" },
      { label: "Airport Directory", href: "/airports" },
      { label: "FBO Listings", href: "/directory?category=fbo" },
      { label: "Charter Operators", href: "/charter-operators" },
      { label: "MRO Centers", href: "/directory?category=mro" },
      { label: "Fuel Suppliers", href: "/directory?category=fuel" },
    ],
  },
  {
    title: "Aviation Tools",
    links: [
      { label: "Weather", href: "/tools/weather" },
      { label: "NOTAM Alerts", href: "/tools/notams" },
      { label: "Runway Diagram", href: "/tools/runway-diagram" },
      { label: "Satellite Map", href: "/tools/satellite-map" },
      { label: "Nearby Airports", href: "/tools/nearby-airports" },
      { label: "Advanced Search", href: "/charter-operators" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Request Demo", href: "/request-demo" },
      { label: "Pricing", href: "/pricing" },
      { label: "Advertise", href: "/advertise" },
      { label: "Data Licence", href: "/data-licence" },
      { label: "News & Blog", href: "/news" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Refund Policy", href: "/legal/refund" },
      { label: "Cookies Policy", href: "/legal/cookies" },
      { label: "GDPR", href: "/legal/gdpr" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com", text: "in" },
  { label: "Instagram", href: "https://www.instagram.com", icon: "/images/shared/instagram.svg" },
  { label: "Facebook", href: "https://www.facebook.com", text: "f" },
  { label: "X", href: "https://x.com", text: "𝕏" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-cyan/10 bg-navy-950 pb-16 md:pb-40">
      <div className="container-site py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <Logo size="lg" />
            <p className="pt-4 text-sm leading-[23.8px] text-white/50 lg:max-w-[430px]">
              The world&apos;s most comprehensive aviation services directory, trusted by pilots, operators, and aviation businesses globally.
            </p>
            <div className="flex gap-3 pt-5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand/8 px-2 text-xs font-bold text-brand transition hover:bg-brand/20"
                >
                  {s.icon ? <Image src={s.icon} alt="" width={16} height={16} /> : s.text}
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="flex flex-col gap-2.5 pt-4">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-white/50 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-brand/20 bg-brand/8 p-6 md:flex-row md:items-center">
          <div className="flex-1">
            <h4 className="text-base font-bold text-white">Aviation Intelligence Newsletter</h4>
            <p className="pt-1 text-sm text-white/50">Weekly updates on new service providers, airport openings, and industry news.</p>
          </div>
          <NewsletterForm />
        </div>

        <div className="mt-10 border-t border-white/8 pt-6">
          <p className="text-xs text-white/35">© {new Date().getFullYear()} Global Aviation Services Directory. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
