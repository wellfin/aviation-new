"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type NewsletterResult = "confirmed" | "invalid" | "unsubscribed";

const COPY: Record<NewsletterResult, { tone: "success" | "error" | "info"; title: string; body: string }> = {
  confirmed: { tone: "success", title: "Subscription confirmed", body: "You're on the list — the weekly aviation intelligence briefing will land in your inbox." },
  unsubscribed: { tone: "info", title: "You've been unsubscribed", body: "You won't receive our newsletter any more. You can re-subscribe at any time from the footer." },
  invalid: { tone: "error", title: "That link didn't work", body: "The newsletter link is invalid or has expired. Subscribe again from the footer to get a fresh one." },
};

/** Result of the API's newsletter confirm/unsubscribe redirects (`/?newsletter=…`). */
export function NewsletterResultBanner({ result }: { result: NewsletterResult }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const copy = COPY[result];

  function dismiss() {
    setOpen(false);
    router.replace("/", { scroll: false });
  }

  return (
    <div className="container-site pt-4">
      <div
        role={copy.tone === "error" ? "alert" : "status"}
        data-testid="newsletter-result"
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-5 py-4",
          copy.tone === "success" && "border-success/30 bg-success/8 text-[#15803d]",
          copy.tone === "info" && "border-brand/25 bg-brand/6 text-navy-900",
          copy.tone === "error" && "border-danger/30 bg-danger/8 text-danger",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{copy.title}</p>
          <p className="mt-0.5 text-sm opacity-80">{copy.body}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-lg p-1 opacity-70 transition hover:opacity-100">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
