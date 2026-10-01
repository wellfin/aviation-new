import Link from "next/link";
import { cn } from "@/lib/utils";

/** Server-rendered pagination that preserves the current query string. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
  className,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages: Array<number | "gap"> = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  // 40px cells as drawn (Figma 752:10376).
  const cell = "flex h-10 min-w-10 items-center justify-center rounded-xl border-[0.755px] border-[#e2e8f0] bg-white px-2 text-sm leading-5 font-semibold text-[#64748b] transition hover:border-brand hover:text-brand";
  const active = "bg-[linear-gradient(135deg,#2f80ed_0%,#00c2ff_100%)] text-white hover:text-white";
  const step = "px-4 text-[13px]";

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(cell, step)} rel="prev">
          ← Prev
        </Link>
      )}
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={cell} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(cell, p === page && active)}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(cell, step, active, "border-transparent")} rel="next">
          Next →
        </Link>
      )}
    </nav>
  );
}
