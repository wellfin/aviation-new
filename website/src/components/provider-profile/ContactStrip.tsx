import Image from "next/image";
import type { Provider, SocialLinks } from "@/lib/types";
import { TIER_RULES, isCharter, telHref, websiteHref } from "./profile-config";

const SOCIALS: Array<{ key: keyof SocialLinks; label: string; glyph: string }> = [
  { key: "linkedin", label: "LinkedIn", glyph: "in" },
  { key: "instagram", label: "Instagram", glyph: "" },
  { key: "facebook", label: "Facebook", glyph: "f" },
  { key: "x", label: "X", glyph: "𝕏" },
];

const item = "flex min-w-0 items-center gap-2 text-sm font-medium text-muted transition hover:text-brand";

/** White strip under the cover band with contact details and social links. */
export function ContactStrip({ provider }: { provider: Provider }) {
  const { contact } = provider;
  const socials = TIER_RULES[provider.tier].socials ? SOCIALS.filter((s) => provider.socials[s.key]) : [];

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] lg:flex-row lg:items-center">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {contact.phone && (
          <li>
            <a href={telHref(contact.phone)} className={item}>
              <span aria-hidden>📞</span>
              <span className="sr-only">Phone: </span>
              {contact.phone}
            </a>
          </li>
        )}
        {contact.email && (
          <li>
            <a href={`mailto:${contact.email}`} className={item}>
              <span aria-hidden>✉️</span>
              <span className="sr-only">Email: </span>
              <span className="truncate">{contact.email}</span>
            </a>
          </li>
        )}
        {contact.website && (
          <li>
            <a href={websiteHref(contact.website)} target="_blank" rel="noopener noreferrer" className={item}>
              <span aria-hidden>🌐</span>
              <span className="sr-only">Website: </span>
              <span className="truncate">{contact.website.replace(/^https?:\/\//, "")}</span>
            </a>
          </li>
        )}
        {isCharter(provider) && contact.fax && (
          <li className={item}>
            <span aria-hidden>📠</span>
            <span className="sr-only">Fax: </span>
            {contact.fax}
          </li>
        )}
        {contact.location && (
          <li className="flex items-center gap-2 text-sm font-medium text-muted">
            <span aria-hidden>📍</span>
            <span className="sr-only">Location: </span>
            {contact.location}
          </li>
        )}
      </ul>
      {socials.length > 0 && (
        <ul className="flex gap-3 lg:ml-auto" aria-label="Social media">
          {socials.map((s) => (
            <li key={s.key}>
              <a
                href={provider.socials[s.key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${provider.name} on ${s.label}`}
                className="flex size-8 items-center justify-center rounded-lg bg-brand/8 text-xs font-bold text-brand transition hover:bg-brand/15"
              >
                {s.key === "instagram" ? <Image src="/images/shared/instagram.svg" alt="" width={16} height={16} /> : <span aria-hidden>{s.glyph}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
