import { CloudOff, type LucideIcon, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AirportLookup } from "@/components/tools-pages/lookup";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-brand/8 text-muted",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/10 text-danger",
} as const;

/** Centered icon + title + text block used before a search and for soft failures. */
export function ToolMessage({
  icon: Icon,
  title,
  children,
  tone = "brand",
  role,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  tone?: keyof typeof TONES;
  role?: "alert" | "status";
}) {
  return (
    <div role={role} className="flex flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className={cn("flex size-14 items-center justify-center rounded-full", TONES[tone])}>
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
      <div className="mt-2 max-w-[260px] text-[13px] leading-5 text-subtle sm:max-w-[320px]">{children}</div>
    </div>
  );
}

/** Friendly panel shown when a third-party integration throws. */
export function ServiceErrorPanel({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-4 rounded-[20px] border border-warning/30 bg-white p-5 shadow-soft">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-warning">
        <CloudOff className="size-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          {children ?? "We couldn't reach our data provider just now. Please try again in a few minutes."}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the non-"found" outcomes of an airport lookup (empty, invalid, not found, error).
 * Returns null when the airport was found so the page can render its results.
 */
export function LookupFallback({ lookup, empty }: { lookup: AirportLookup; empty: ReactNode }) {
  switch (lookup.status) {
    case "empty":
      return <>{empty}</>;
    case "invalid":
      return (
        <ToolMessage icon={SearchX} title="That doesn't look like an airport code" tone="warning" role="alert">
          <p>
            &ldquo;{lookup.code}&rdquo; isn&apos;t a valid ICAO or IATA code. Use 3–4 letters or digits, e.g. EGLL or LHR.
          </p>
        </ToolMessage>
      );
    case "not-found":
      return (
        <ToolMessage icon={SearchX} title="Airport not found" tone="warning" role="status">
          <p>
            We couldn&apos;t find an airport with the code &ldquo;{lookup.code}&rdquo;. Check the code or{" "}
            <Link href="/airports" className="font-semibold text-brand hover:underline">
              browse the airport directory
            </Link>
            .
          </p>
        </ToolMessage>
      );
    case "error":
      return <ServiceErrorPanel title="Airport data is temporarily unavailable" />;
    case "found":
      return null;
  }
}
