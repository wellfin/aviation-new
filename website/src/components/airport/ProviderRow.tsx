import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { TierBadge } from "@/components/ui/Badge";
import { CategoryName } from "@/components/categories/CategoriesContext";
import type { Provider } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { RevealContact } from "./RevealContact";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 text-sm leading-[21px] text-black sm:grid-cols-[113px_minmax(0,1fr)]">
      <dt className="font-bold">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const webHref = (site: string) => (site.startsWith("http") ? site : `https://${site}`);

/**
 * Directory-style provider listing used on the airport page.
 * Ultra Pro: highlighted with logo, rating and a details CTA; Pro: logo + full contacts;
 * Basic: contact details are revealed on demand.
 */
export function ProviderRow({ provider: p }: { provider: Provider }) {
  const href = `/providers/${p.slug}`;
  const premium = p.tier !== "basic";
  const { contact } = p;

  return (
    <article className={cn("border-b border-[#6e788e] px-4 py-5", p.tier === "ultra_pro" && "bg-[#eaf7ff]/85")}>
      {premium && (
        <div className="relative mb-2 flex h-[77px] w-full max-w-[323px] items-center">
          {p.logo ? (
            <Image src={p.logo} alt={`${p.name} logo`} fill sizes="323px" className="object-contain object-left" />
          ) : (
            <span className="bg-brand-gradient flex size-16 items-center justify-center rounded-xl text-xl font-extrabold text-white" aria-hidden>
              {p.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
        </div>
      )}

      {p.tier === "ultra_pro" && (
        <p className="flex items-center gap-1 pb-1 text-sm text-black" aria-label={`Rated ${p.rating} out of 5 from ${p.reviewCount} reviews`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("size-3.5", i < Math.round(p.rating) ? "fill-warning text-warning" : "text-line")} aria-hidden />
          ))}
          <span className="pl-1 font-bold">{p.rating.toFixed(1)}</span>
          <span>({formatNumber(p.reviewCount)} reviews)</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 py-2">
        <h3 className="text-lg leading-[27px] font-bold text-[#444] uppercase">
          <Link href={href} className="hover:text-brand">
            {p.name}
          </Link>
        </h3>
        {premium && <TierBadge tier={p.tier} className="bg-navy-900" />}
      </div>

      <dl className="max-w-[480px] space-y-1.5">
        <Field label="Service">
          <CategoryName slug={p.category} long />
        </Field>
        <Field label="Address">{contact.address}</Field>
        {premium ? (
          <>
            <Field label="Phone">
              <a href={telHref(contact.phone)} className="hover:text-brand">
                {contact.phone}
              </a>
            </Field>
            <Field label="Email">
              <a href={`mailto:${contact.email}`} className="hover:text-brand">
                {contact.email}
              </a>
            </Field>
            <Field label="Website">
              <a href={webHref(contact.website)} target="_blank" rel="noopener noreferrer" className="text-[#113f9d] hover:underline">
                {contact.website}
              </a>
            </Field>
            {contact.fax && (
              <Field label="FAX">
                <span className="text-[#113f9d]">{contact.fax}</span>
              </Field>
            )}
          </>
        ) : (
          <>
            <Field label="Phone">
              <RevealContact label="Show Phone Number" value={contact.phone} href={telHref(contact.phone)} />
            </Field>
            <Field label="Email">
              <RevealContact label="Show Email" value={contact.email} href={`mailto:${contact.email}`} />
            </Field>
            <Field label="Website">
              <RevealContact label="Show Website" value={contact.website} href={webHref(contact.website)} />
            </Field>
          </>
        )}
      </dl>

      {p.tier === "ultra_pro" && (
        <Link href={href} className="bg-brand-gradient mt-4 inline-flex h-10 items-center rounded-xl px-4 text-sm font-bold text-white transition hover:brightness-110">
          See More Details
        </Link>
      )}
    </article>
  );
}
