"use client";

import Image from "next/image";
import { useState } from "react";
import { publicConfig } from "@/lib/public-config";

const PROVIDERS = [
  { key: "google", label: "Google", icon: "/images/auth/google.svg" },
  { key: "linkedin", label: "LinkedIn", icon: "/images/auth/linkedin.svg" },
] as const;

const BTN =
  "flex h-12 items-center justify-center gap-2.5 rounded-xl border border-line bg-white text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand/3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** "or continue with" divider + Google / LinkedIn buttons. Real OAuth is handled by the backend. */
export function SocialButtons() {
  const [notice, setNotice] = useState(false);
  const isApi = publicConfig.dataSource === "api";

  return (
    <div>
      <div className="flex items-center gap-3 pt-3.5" aria-hidden>
        <span className="h-px flex-1 bg-[#f1f5f9]" />
        <span className="text-xs font-medium text-subtle">or continue with</span>
        <span className="h-px flex-1 bg-[#f1f5f9]" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const content = (
            <>
              <Image src={p.icon} alt="" width={18} height={18} />
              {p.label}
            </>
          );
          return isApi ? (
            <a key={p.key} href={`${publicConfig.apiBaseUrl}/api/v1/auth/oauth/${p.key}`} className={BTN} aria-label={`Continue with ${p.label}`}>
              {content}
            </a>
          ) : (
            <button key={p.key} type="button" className={BTN} onClick={() => setNotice(true)} aria-label={`Continue with ${p.label}`}>
              {content}
            </button>
          );
        })}
      </div>
      {notice && (
        <p role="status" className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-center text-xs text-muted">
          Social sign-in needs the backend — it&apos;s disabled in demo mode. Please use email and password.
        </p>
      )}
    </div>
  );
}
