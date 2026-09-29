"use client";

import { useState } from "react";
import { AdvertiseEnquiryDialog } from "./AdvertiseEnquiryDialog";
import { CUSTOM_PACKAGE, type AdFormat } from "./formats";

const card = "rounded-[20px] bg-white shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]";

/** Ad format cards + "Ready to advertise?" CTA; both open the enquiry dialog. */
export function AdvertiseFormats({ formats }: { formats: AdFormat[] }) {
  const [placement, setPlacement] = useState<string | null>(null);

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {formats.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setPlacement(f.id)}
              aria-haspopup="dialog"
              className={`${card} group flex h-full min-h-[194px] w-full flex-col items-start p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(11,31,58,0.12)] focus-visible:outline-2 focus-visible:outline-brand`}
            >
              <span className="text-[30px] leading-9" aria-hidden>
                {f.icon}
              </span>
              <span className="pt-3 text-base leading-6 font-bold text-ink">{f.title}</span>
              <span className="pt-1 text-sm leading-5 text-muted">{f.description}</span>
              {f.priceLabel && <span className="pt-2 text-sm font-semibold text-ink">{f.priceLabel}</span>}
              <span className="mt-auto pt-4 text-[13px] font-semibold text-brand opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Enquire →</span>
            </button>
          </li>
        ))}
      </ul>

      <section aria-labelledby="advertise-cta-title" className={`${card} mt-12 p-6 text-center sm:p-8`}>
        <h2 id="advertise-cta-title" className="text-2xl leading-8 font-bold text-ink">
          Ready to advertise?
        </h2>
        <p className="pt-3 pb-6 text-base leading-6 text-muted">Contact our media team for a custom package tailored to your aviation brand.</p>
        <button
          type="button"
          onClick={() => setPlacement(CUSTOM_PACKAGE.id)}
          aria-haspopup="dialog"
          className="bg-brand-gradient inline-flex h-14 items-center rounded-xl px-6 text-base font-semibold text-white transition hover:brightness-110 sm:px-10"
        >
          Get Advertising Package →
        </button>
      </section>

      {placement !== null && <AdvertiseEnquiryDialog key={placement} placement={placement} formats={formats} onClose={() => setPlacement(null)} />}
    </>
  );
}
