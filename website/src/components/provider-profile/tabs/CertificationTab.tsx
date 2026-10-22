"use client";

import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import type { Certification } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { Dialog } from "../Dialog";
import { CARD, TILE } from "../styles";

export function CertificationTab({ certifications, providerName }: { certifications: Certification[]; providerName: string }) {
  const [open, setOpen] = useState<Certification | null>(null);

  return (
    <section className={`${CARD} p-6`} aria-labelledby="cert-heading">
      <h2 id="cert-heading" className="text-xl font-bold text-ink md:text-2xl">
        Certification
      </h2>
      {certifications.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No certifications have been published yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {certifications.map((c, i) => (
            <li key={c.code}>
              <button type="button" onClick={() => setOpen(c)} className={cn(TILE, "w-full", i === 0 ? "bg-brand-gradient" : "bg-navy-900")} aria-haspopup="dialog">
                {/* Figma: the certificate name only; issuer, number and validity open in the dialog. */}
                <span className="text-base font-bold uppercase md:text-lg">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Opening a certificate always shows the certificate itself (Figma): the uploaded scan, or, until
          one is uploaded, a certificate drawn from its details. */}
      <Dialog open={open !== null} onClose={() => setOpen(null)} title={`${open?.name ?? "Certificate"} certificate`} tone="bare" className="max-w-[720px]">
        {open &&
          (open.image ? (
            // View only: no save-image menu or dragging the file out.
            <div className="relative aspect-[3/4] max-h-[85vh] w-full overflow-hidden rounded-[20px] bg-white select-none" onContextMenu={(e) => e.preventDefault()}>
              <Image
                src={open.image}
                alt={`${open.name} certificate of ${providerName}`}
                fill
                sizes="720px"
                draggable={false}
                unoptimized={/^https?:/i.test(open.image)}
                className="pointer-events-none object-contain"
              />
            </div>
          ) : (
            <CertificateDocument cert={open} providerName={providerName} />
          ))}
      </Dialog>
    </section>
  );
}

/** A certificate page drawn from the listing's details, shown when no scan has been uploaded. */
function CertificateDocument({ cert, providerName }: { cert: Certification; providerName: string }) {
  return (
    <div className="mx-auto w-fit max-w-full rounded-[20px] bg-white p-3 sm:p-4">
      <div className="flex aspect-[3/4] h-[min(80vh,860px)] max-w-full flex-col items-center rounded-[12px] border-[6px] border-double border-[#b8952f] bg-[radial-gradient(circle_at_50%_40%,#fffdf6_0%,#f7f0dc_100%)] px-6 py-8 text-center font-serif text-[#2b2b2b] sm:px-12 sm:py-12">
        <p className="text-xs font-semibold tracking-[0.4em] text-[#8a6d1f] uppercase sm:text-sm">Certificate of Accreditation</p>
        <p className="mt-6 text-3xl font-bold text-navy-900 uppercase sm:mt-10 sm:text-5xl">{cert.name}</p>
        <div className="mt-4 h-px w-2/3 bg-[#b8952f]/60" aria-hidden />
        <p className="mt-6 text-sm italic sm:mt-10 sm:text-base">This is to certify that</p>
        <p className="mt-2 text-xl font-bold sm:text-3xl">{providerName}</p>
        <p className="mt-4 max-w-md text-sm leading-6 italic sm:text-base">
          meets the requirements of {cert.name} and has been accredited by {cert.issuer}.
        </p>
        <div className="mt-auto flex w-full items-end justify-between gap-4 pt-8 text-left text-xs sm:text-sm">
          <div>
            <p className="font-sans text-[10px] tracking-[0.2em] text-[#8a6d1f] uppercase">Certificate No.</p>
            <p className="font-mono font-bold">{cert.code}</p>
          </div>
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-[#b8952f] bg-[#f3e2a9] text-[#8a6d1f] sm:size-24" aria-hidden>
            <BadgeCheck className="size-8 sm:size-12" />
          </span>
          <div className="text-right">
            <p className="font-sans text-[10px] tracking-[0.2em] text-[#8a6d1f] uppercase">Valid Until</p>
            <p className="font-bold">{formatDate(cert.validUntil)}</p>
          </div>
        </div>
        <p className="pt-4 text-xs text-[#555] sm:text-sm">Issued by {cert.issuer}</p>
      </div>
    </div>
  );
}
