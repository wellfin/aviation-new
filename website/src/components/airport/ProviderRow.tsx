import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Provider } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { RevealContact } from "./RevealContact";

/** One label / value line: bold label, value 113px in (Figma 752:10225). `className` sets the line's drawn height. */
function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-[96px_minmax(0,1fr)] text-sm leading-[21px] text-black sm:grid-cols-[113px_minmax(0,1fr)]", className)}>
      <dt className="font-bold">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const webHref = (site: string) => (site.startsWith("http") ? site : `https://${site}`);
const BLUE = "text-[#113f9d]";

/**
 * Provider listing on the airport page (Figma 752:9750), set in Open Sans.
 * Ultra Pro: tinted block with logo, rating and a details button (752:10213); Pro: logo and
 * full contacts (752:10249); Basic: name and contacts revealed on demand (1021:4105).
 */
export function ProviderRow({ provider: p }: { provider: Provider }) {
  const href = `/providers/${p.slug}`;
  const ultra = p.tier === "ultra_pro";
  const premium = p.tier !== "basic";
  const { contact } = p;

  const name = (
    <h3 className="text-lg leading-[27px] font-bold text-[#444] uppercase">
      <Link href={href} className="hover:text-brand">
        {p.name}
      </Link>
    </h3>
  );

  if (!premium) {
    return (
      <article className="font-open-sans border-b-[0.8px] border-[#6e788e] pt-[7px] pr-4 pb-4 pl-[15px]">
        {name}
        <dl className="max-w-[464px] space-y-1.5 pt-[30px]">
          <Field label="Address" className="min-h-[47px]">
            {contact.address}
          </Field>
          <Field label="Phone" className="min-h-7">
            <RevealContact label="Show Phone Number" value={contact.phone} href={telHref(contact.phone)} />
          </Field>
          <Field label="Email" className="min-h-7">
            <RevealContact label="Show Email" value={contact.email} href={`mailto:${contact.email}`} />
          </Field>
          <Field label="Website" className="min-h-7">
            <RevealContact label="Show Website" value={contact.website} href={webHref(contact.website)} />
          </Field>
        </dl>
      </article>
    );
  }

  return (
    <article className={cn("font-open-sans border-b-[0.8px] border-[#6e788e] pt-[25px] pr-4 pl-[15px]", ultra ? "bg-[#eaf7ff]/85 pb-1" : "pb-[9px]")}>
      <div className={cn("relative w-full max-w-[323px]", ultra ? "h-[77px]" : "h-[85px]")}>
        {p.logo ? (
          <Image src={p.logo} alt={`${p.name} logo`} fill sizes="323px" className="object-contain object-left-top" />
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

      {ultra && (
        <p className="flex h-7 items-center gap-1 pt-2 font-sans text-sm leading-5 text-black" aria-label={`Rated ${p.rating} out of 5 from ${p.reviewCount} reviews`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Image key={i} src="/images/airport/rating-star.svg" alt="" width={14} height={14} className={cn("size-3.5", i >= Math.round(p.rating) && "opacity-25 grayscale")} />
          ))}
          <span className="pl-1 font-bold">{p.rating.toFixed(1)}</span>
          <span>({formatNumber(p.reviewCount)} reviews)</span>
        </p>
      )}

      <div className="min-h-[42px] pt-[5.6px]">{name}</div>

      <dl className="max-w-[424px]">
        <Field label="Address" className="min-h-[49px] pb-[7px]">
          {contact.address}
        </Field>
        <Field label="Phone" className="min-h-[27px]">
          <a href={telHref(contact.phone)} className="hover:text-brand">
            {contact.phone}
          </a>
        </Field>
        {contact.phone2 && (
          <Field label="Phone" className="min-h-[29px]">
            <a href={telHref(contact.phone2)} className="hover:text-brand">
              {contact.phone2}
            </a>
          </Field>
        )}
        <Field label="Email" className="min-h-[31px]">
          <a href={`mailto:${contact.email}`} className="hover:text-brand">
            {contact.email}
          </a>
        </Field>
        {contact.email2 && (
          <Field label="Email" className="min-h-[31px]">
            <a href={`mailto:${contact.email2}`} className="hover:text-brand">
              {contact.email2}
            </a>
          </Field>
        )}
        <Field label="Website" className="min-h-[27px]">
          <a href={webHref(contact.website)} target="_blank" rel="noopener noreferrer" className={cn(BLUE, "hover:underline")}>
            {contact.website}
          </a>
        </Field>
        {contact.fax && (
          <Field label="FAX" className="min-h-[27px]">
            <span className={BLUE}>{contact.fax}</span>
          </Field>
        )}
        {contact.sita && (
          <Field label="SITA" className="min-h-[27px]">
            <span className={BLUE}>{contact.sita}</span>
          </Field>
        )}
      </dl>

      {ultra && (
        // 10px left of the text column, 3px under the last line (Figma 905:15671).
        <Link
          href={href}
          className="mt-[3px] -ml-2.5 inline-flex h-[41px] items-center rounded-xl bg-[linear-gradient(163.34deg,#2f80ed_0%,#00c2ff_100%)] pr-5 pl-[13px] text-sm leading-[21px] font-bold text-white transition hover:brightness-110"
        >
          See More Details
        </Link>
      )}
    </article>
  );
}
