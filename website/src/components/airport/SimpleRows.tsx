import type { ReactNode } from "react";

export interface SimpleRow {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

/** 88px white row cards with a label on the left and a value on the right (Figma 949:5566 frequencies, 949:1022 fire/RFFS). */
export function SimpleRows({ rows, caption }: { rows: SimpleRow[]; caption: string }) {
  return (
    <dl aria-label={caption} className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex min-h-[88px] items-center gap-4 rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
          {/* Invisible 56px lead-in the design keeps before the label. */}
          <span className="hidden size-14 shrink-0 xl:block" aria-hidden />
          <dt className="min-w-0 flex-1 text-sm leading-5 font-semibold text-ink">{r.label}</dt>
          <dd className="max-w-[55%] shrink-0 px-3.5 text-right text-[15px] leading-5 font-medium break-words text-[#757575] md:text-base">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
