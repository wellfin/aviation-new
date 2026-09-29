import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RevealContact } from "./RevealContact";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm leading-[21px] text-black">
      <dt className="w-[100px] shrink-0 font-bold">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const site = (domain: string) => (domain.startsWith("http") ? domain : `https://${domain}`);

/**
 * One operator in the charter results list. Paid listings show full contact details
 * (Ultra Pro rows are highlighted); basic listings reveal contacts on demand.
 */
export function CharterResult({ provider }: { provider: Provider }) {
  const href = `/providers/${provider.slug}`;
  const { contact } = provider;
  const featured = provider.tier !== "basic";

  return (
    <article className={cn("border-b border-[#6e788e]/60 px-4 py-6", provider.tier === "ultra_pro" && "bg-[rgba(234,247,255,0.85)]")}>
      {featured && provider.logo && (
        <Link href={href} className="relative mb-3 block h-[70px] w-full max-w-[323px]" tabIndex={-1} aria-hidden>
          <Image src={provider.logo} alt="" fill sizes="323px" className="object-contain object-left" />
        </Link>
      )}
      <h2 className="text-lg leading-[27px] font-bold text-[#444] uppercase">
        <Link href={href} className="hover:text-brand">
          {provider.name}
        </Link>
      </h2>
      <dl className="mt-3 flex flex-col gap-1.5">
        <Row label="Address">{contact.address}</Row>
        {featured ? (
          <>
            <Row label="Phone">
              <a href={tel(contact.phone)} className="hover:text-brand">
                {contact.phone}
              </a>
            </Row>
            <Row label="Email">
              <a href={`mailto:${contact.email}`} className="break-all hover:text-brand">
                {contact.email}
              </a>
            </Row>
            <Row label="Website">
              <a href={site(contact.website)} target="_blank" rel="noopener noreferrer" className="break-all text-[#113f9d] hover:underline">
                {contact.website}
              </a>
            </Row>
            {contact.fax && (
              <Row label="FAX">
                <span className="text-[#113f9d]">{contact.fax}</span>
              </Row>
            )}
          </>
        ) : (
          <>
            <Row label="Phone">
              <RevealContact label="Show Phone Number" value={contact.phone} href={tel(contact.phone)} />
            </Row>
            <Row label="Email">
              <RevealContact label="Show Email" value={contact.email} href={`mailto:${contact.email}`} />
            </Row>
            <Row label="Website">
              <RevealContact label="Show Website" value={contact.website} href={site(contact.website)} external />
            </Row>
          </>
        )}
      </dl>
      {featured && (
        <Link
          href={href}
          className="bg-brand-gradient mt-4 inline-flex h-10 items-center rounded-[12px] px-4 text-sm font-bold text-white transition hover:brightness-110"
        >
          See More Details
        </Link>
      )}
    </article>
  );
}
