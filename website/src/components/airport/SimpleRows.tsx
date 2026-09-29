import type { ReactNode } from "react";

export interface SimpleRow {
  key: string;
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
}

/** White pill rows with a label on the left and a value on the right (frequencies, fire/RFFS). */
export function SimpleRows({ rows, caption }: { rows: SimpleRow[]; caption: string }) {
  return (
    <dl aria-label={caption} className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex min-h-[52px] flex-col gap-1 rounded-[20px] bg-white px-5 py-3.5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-[52px]"
        >
          <dt className="text-sm font-medium text-ink">
            {r.label}
            {r.meta && <span className="mt-0.5 block text-xs text-subtle">{r.meta}</span>}
          </dt>
          <dd className="text-sm font-medium text-muted sm:text-right">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
