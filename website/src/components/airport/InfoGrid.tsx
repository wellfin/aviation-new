import Image from "next/image";
import type { ReactNode } from "react";

export interface InfoField {
  label: string;
  value: ReactNode;
}

/** One 75px row card holding a pair of label/value fields (Figma 752:567). */
function Row({ pair }: { pair: InfoField[] }) {
  return (
    <div className="grid gap-3 rounded-[20px] bg-white px-5 py-2 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:min-h-[75px] sm:grid-cols-2 sm:items-center sm:gap-8 lg:px-[45px] xl:grid-cols-[254px_minmax(0,1fr)] xl:gap-[167px]">
      {pair.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-sm leading-5 font-semibold text-ink uppercase">{f.label}</dt>
          <dd className="text-[15px] leading-5 font-medium break-words text-[#757575] md:text-base">{f.value}</dd>
        </div>
      ))}
    </div>
  );
}

function pairs(fields: InfoField[]): InfoField[][] {
  const out: InfoField[][] = [];
  for (let i = 0; i < fields.length; i += 2) out.push(fields.slice(i, i + 2));
  return out;
}

/** Two-column key/value row cards with an optional "More … (Click to expand)" disclosure. */
export function InfoGrid({ fields, more, moreLabel }: { fields: InfoField[]; more?: InfoField[]; moreLabel?: string }) {
  return (
    <div className="space-y-2">
      <dl className="space-y-2">
        {pairs(fields).map((p) => (
          <Row key={p[0].label} pair={p} />
        ))}
      </dl>
      {more && more.length > 0 && (
        <details className="group">
          <summary className="flex min-h-[75px] cursor-pointer list-none items-center justify-between gap-4 rounded-b-[18px] bg-brand/41 px-5 py-2 text-ink transition hover:bg-brand/50 lg:px-[45px] [&::-webkit-details-marker]:hidden">
            <span className="text-base leading-5 font-bold md:text-xl">{moreLabel ?? "More Information"} (Click to expand)</span>
            {/* 48×19 slot; the arrow artwork is 48×22.7 and overhangs the slot's bottom edge, as in the design. */}
            <span className="relative h-[19px] w-12 shrink-0 transition group-open:rotate-180" aria-hidden>
              <Image src="/images/airport/expand-arrow.svg" alt="" width={48} height={23} className="absolute top-0 left-0 h-[22.7px] w-12 max-w-none" />
            </span>
          </summary>
          <dl className="mt-2 space-y-2">
            {pairs(more).map((p) => (
              <Row key={p[0].label} pair={p} />
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
