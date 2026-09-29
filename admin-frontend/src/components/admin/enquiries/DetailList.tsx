import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Spans both columns (long text). */
  wide?: boolean;
}

/** Two-column definition list for record detail screens. Empty values show a dash. */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
          <dt className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-line text-ink">{item.value === "" || item.value == null ? "—" : item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </Link>
  );
}

/** Inline mailto / tel links for contact details. */
export function ContactLink({ kind, value }: { kind: "email" | "phone"; value: string | null | undefined }) {
  if (!value) return <>—</>;
  const href = kind === "email" ? `mailto:${value}` : `tel:${value.replace(/[^\d+]/g, "")}`;
  return (
    <a href={href} className="font-medium text-brand hover:underline">
      {value}
    </a>
  );
}
