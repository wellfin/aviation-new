"use client";

import { RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Friendly fallback for a page whose data couldn't be loaded (API down or
 * erroring). Rendered by the route-group error boundaries.
 */
export function ErrorSection({ retry, digest }: { retry: () => void; digest?: string }) {
  return (
    <section className="bg-surface px-4 py-20 md:py-28" aria-labelledby="error-title">
      <div className="mx-auto flex max-w-[560px] flex-col items-center rounded-[20px] bg-white px-6 py-12 text-center shadow-card">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-warning/12 text-3xl" aria-hidden>
          🛰️
        </span>
        <p className="mt-6 font-mono text-xs tracking-[2px] text-muted uppercase">Service interruption</p>
        <h1 id="error-title" className="mt-2 text-2xl font-extrabold text-ink md:text-3xl">
          We couldn&apos;t load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Our systems are temporarily unreachable. Please try again in a moment — your data is safe.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={retry}>
            <RefreshCw className="size-4" aria-hidden /> Try again
          </Button>
          <ButtonLink href="/" variant="outline">
            Back to Home
          </ButtonLink>
        </div>
        {digest && <p className="mt-6 font-mono text-[11px] text-subtle">Reference: {digest}</p>}
      </div>
    </section>
  );
}
