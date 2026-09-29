"use client";

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
                <span className="text-base font-bold uppercase md:text-lg">{c.name}</span>
                <span className="text-[11px] leading-4 font-semibold tracking-[0.6px] text-white/70">{c.issuer}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? "Certificate"} subtitle={providerName} className="max-w-[480px]">
        {open && (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
              <BadgeCheck className="size-8" aria-hidden />
            </span>
            <p className="mt-4 text-xl font-extrabold text-ink">{open.name}</p>
            <p className="text-sm text-muted">Issued by {open.issuer}</p>
            <dl className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-brand/10 bg-brand/4 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-[0.6px] text-subtle uppercase">Certificate No.</dt>
                <dd className="mt-0.5 font-mono text-sm font-bold text-ink">{open.code}</dd>
              </div>
              <div className="rounded-xl border border-brand/10 bg-brand/4 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-[0.6px] text-subtle uppercase">Valid Until</dt>
                <dd className="mt-0.5 text-sm font-bold text-ink">{formatDate(open.validUntil)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Dialog>
    </section>
  );
}
