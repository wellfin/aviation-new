import Link from "next/link";
import { AlertTriangle, Check, Info } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CookieManager } from "./CookieManager";
import type { Inline, LegalBlock, Rich } from "./types";

function InlineRun({ run }: { run: Inline }) {
  if (typeof run === "string") return <>{run}</>;
  if ("strong" in run) return <strong className="font-semibold text-ink">{run.text}</strong>;
  const external = /^https?:/.test(run.href);
  if (external || run.href.startsWith("mailto:")) {
    return (
      <a href={run.href} className="font-medium text-brand hover:underline" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {run.text}
      </a>
    );
  }
  return (
    <Link href={run.href} className="font-medium text-brand hover:underline">
      {run.text}
    </Link>
  );
}

export function RichText({ value }: { value: Rich }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((run, i) => (
        <InlineRun key={i} run={run} />
      ))}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-sm leading-[22px] text-ink/80 sm:text-[15px] sm:leading-6">
          <RichText value={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("flex flex-col gap-2 text-sm leading-[22px] text-ink/80 sm:text-[15px]", block.ordered ? "list-decimal pl-5" : "pl-1")}>
          {block.items.map((item, i) => (
            <li key={i} className={block.ordered ? undefined : "flex gap-3"}>
              {!block.ordered && <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
              <span>
                <RichText value={item} />
              </span>
            </li>
          ))}
        </Tag>
      );
    }
    case "cards":
      return (
        <div className={cn("grid gap-3", block.columns === 2 ? "sm:grid-cols-2" : "md:grid-cols-3")}>
          {block.items.map((card) => (
            <div key={card.title} className="rounded-xl border border-line/80 bg-[#eef4fc] p-4">
              <h3 className="text-sm font-semibold text-ink">{card.title}</h3>
              {card.text && <p className="mt-1.5 text-xs leading-5 text-muted">{card.text}</p>}
              {card.items && (
                <ul className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted">
                  {card.items.map((it) => (
                    <li key={it}>· {it}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    case "checks":
      return (
        <ul className="flex flex-col gap-3">
          {block.items.map((item) => (
            <li key={item.title} className="flex gap-3 rounded-xl border border-line/80 bg-[#eef4fc] px-4 py-4">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand" aria-hidden>
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-surface text-xs font-semibold tracking-[0.4px] text-muted uppercase">
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-4 py-3 font-medium text-ink">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="px-4 py-3 text-ink/80">
                        {cell === "Yes" || cell === "No" ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                              cell === "Yes" ? "bg-success/12 text-[#15803d]" : "bg-danger/10 text-danger",
                            )}
                          >
                            {cell === "Yes" ? "✓ Yes" : "✕ No"}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const Icon = block.tone === "warning" ? AlertTriangle : Info;
      return (
        <div
          className={cn(
            "flex gap-3 rounded-xl border p-4 text-sm leading-[22px]",
            block.tone === "warning" ? "border-warning/40 bg-warning/8 text-ink/85" : "border-brand/25 bg-brand/5 text-ink/85",
          )}
          role="note"
        >
          <Icon className={cn("mt-0.5 size-5 shrink-0", block.tone === "warning" ? "text-[#b7791f]" : "text-brand")} aria-hidden />
          <p>
            {block.title && <strong className="font-semibold text-ink">{block.title}: </strong>}
            <RichText value={block.text} />
          </p>
        </div>
      );
    }
    case "address":
      return (
        <address className="rounded-xl border border-line/80 bg-[#eef4fc] p-5 text-sm leading-[22px] not-italic">
          <span className="block font-semibold text-ink">{block.title}</span>
          {block.lines.map((l) => (
            <span key={l} className="block text-muted">
              {l}
            </span>
          ))}
          <a href={`mailto:${block.email}`} className="mt-2 inline-block text-brand hover:underline">
            {block.email}
          </a>
        </address>
      );
    case "cta":
      return (
        <div>
          <ButtonLink href={block.href} size="md" className="mt-1">
            {block.label}
          </ButtonLink>
        </div>
      );
    case "highlights":
      return (
        <ul className="grid gap-4 sm:grid-cols-3">
          {block.items.map((h) => (
            <li key={h.title} className="rounded-2xl border border-line/60 bg-white p-5 text-center shadow-soft">
              <span className="text-2xl" aria-hidden>
                {h.emoji}
              </span>
              <h2 className="mt-3 text-[15px] font-bold text-ink">{h.title}</h2>
              <p className="mt-1.5 text-[13px] leading-5 text-muted">{h.text}</p>
            </li>
          ))}
        </ul>
      );
    case "banner":
      return (
        <div className="flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-bold text-white sm:text-lg">{block.title}</p>
            <p className="mt-1.5 max-w-[680px] text-sm leading-5 text-white/55">{block.text}</p>
          </div>
          {block.cta && (
            <ButtonLink href={block.cta.href} className="shrink-0">
              {block.cta.label}
            </ButtonLink>
          )}
        </div>
      );
    case "cookie-manager":
      return <CookieManager />;
  }
}

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </>
  );
}
