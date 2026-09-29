import type { ReactNode } from "react";
import { Triangle } from "lucide-react";

export interface InfoField {
  label: string;
  value: ReactNode;
}

function Row({ pair }: { pair: InfoField[] }) {
  return (
    <div className="grid gap-3 rounded-[20px] bg-white px-5 py-3 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:min-h-[75px] sm:grid-cols-2 sm:items-center sm:gap-8 md:px-[45px]">
      {pair.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-sm leading-5 font-semibold text-ink uppercase">{f.label}</dt>
          <dd className="mt-1 text-[15px] leading-5 font-medium break-words text-[#757575] md:text-base">{f.value}</dd>
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

/** Two-column key/value cards with an optional "More … (Click to expand)" disclosure. */
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
          <summary className="flex min-h-[75px] cursor-pointer list-none items-center justify-between gap-4 rounded-b-[18px] bg-brand/41 px-5 py-2 text-ink transition hover:bg-brand/50 md:px-[45px] [&::-webkit-details-marker]:hidden">
            <span className="text-base leading-5 font-bold md:text-xl">{moreLabel ?? "More Information"} (Click to expand)</span>
            <Triangle className="size-5 shrink-0 rotate-180 fill-ink transition group-open:rotate-0" aria-hidden />
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
