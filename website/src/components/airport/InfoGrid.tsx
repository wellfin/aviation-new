import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InfoField {
  label: string;
  value: ReactNode;
}

/** One 75px row card holding a pair of label/value fields (Figma 752:567). */
function Row({ pair }: { pair: InfoField[] }) {
  return (
    <div className="grid gap-3 rounded-[20px] bg-white px-5 py-2 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:min-h-[75px] sm:grid-cols-2 sm:items-center sm:gap-8 lg:px-[45px] xl:grid-cols-[254px_minmax(0,1fr)] xl:gap-[136px]">
      {pair.map((f, i) => (
        <div key={f.label} className="min-w-0">
          {/* As drawn: a long left label stays on one line (it may run into the gap); the right label wraps at 270px. */}
          <dt className={cn("text-sm leading-5 font-semibold text-ink uppercase", i === 0 ? "xl:whitespace-nowrap" : "xl:max-w-[270px]")}>{f.label}</dt>
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
export function InfoGrid({
  fields,
  more,
  moreLabel,
  openBar = "rounded",
}: {
  fields: InfoField[];
  more?: InfoField[];
  moreLabel?: string;
  /** How the bar is drawn once expanded: rounded with an up arrow (Figma 704:2393) or square with a wide down arrow (Figma 752:7568). */
  openBar?: "rounded" | "square";
}) {
  const square = openBar === "square";
  return (
    <div className="space-y-2">
      <dl className="space-y-2">
        {pairs(fields).map((p) => (
          <Row key={p[0].label} pair={p} />
        ))}
      </dl>
      {more && more.length > 0 && (
        <details className="group">
          {/* Closed: square top, 48px down arrow (Figma 752:589). Open: blue bottom rule and a 61px arrow, drawn per `openBar`. */}
          <summary className={cn("flex min-h-[75px] cursor-pointer list-none items-center justify-between gap-4 rounded-b-[18px] border-b-[0.61px] border-transparent bg-brand/41 px-5 py-2 text-ink transition hover:bg-brand/50 group-open:border-[#0073e7] lg:px-[45px] [&::-webkit-details-marker]:hidden", square ? "group-open:rounded-none" : "group-open:rounded-[20px]")}>
            <span className="text-base leading-5 font-bold md:text-xl">{moreLabel ?? "More Information"} (Click to expand)</span>
            {/* The arrow artwork overhangs its 19px-tall slot's bottom edge, as in the design. */}
            <span className="relative h-[19px] w-12 shrink-0 group-open:hidden" aria-hidden>
              <Image src="/images/airport/expand-arrow.svg" alt="" width={48} height={23} className="absolute top-0 left-0 h-[22.7px] w-12 max-w-none" />
            </span>
            <span className="relative hidden h-[19px] w-[61px] shrink-0 group-open:block" aria-hidden>
              {square ? (
                <Image src="/images/airport/expand-arrow-wide.svg" alt="" width={61} height={29} className="absolute top-0 left-0 h-[29.2px] w-[61px] max-w-none" />
              ) : (
                <Image src="/images/airport/collapse-arrow.svg" alt="" width={61} height={23} className="absolute top-0 left-0 h-[22.9px] w-[61px] max-w-none" />
              )}
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
