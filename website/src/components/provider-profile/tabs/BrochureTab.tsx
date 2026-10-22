"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import type { Brochure } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "../Dialog";
import { CARD, TILE } from "../styles";

/** PDF viewer flags: hide the toolbar (and with it the download / print buttons) where the browser supports it. */
const VIEW_ONLY = "#toolbar=0&navpanes=0";
const viewable = (b: Brochure) => b.fileType === "PDF" && b.url !== "" && b.url !== "#";

/**
 * Brochure tiles. A brochure opens for reading in a dialog on this page — it is never downloaded or
 * opened in a new tab.
 */
export function BrochureTab({ brochures }: { brochures: Brochure[] }) {
  const [open, setOpen] = useState<Brochure | null>(null);

  return (
    <section className={`${CARD} p-6`} aria-labelledby="brochure-heading">
      <h2 id="brochure-heading" className="text-xl font-bold text-ink md:text-2xl">
        Brochure
      </h2>
      {brochures.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No brochures have been published yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {brochures.map((b, i) => (
            <li key={b.title}>
              <button type="button" onClick={() => setOpen(b)} aria-haspopup="dialog" className={cn(TILE, "group w-full", i === 0 ? "bg-brand-gradient" : "bg-navy-900")}>
                {/* Figma: the brochure name only; type and size stay available to screen readers. */}
                <span className="line-clamp-1 text-base font-bold uppercase md:text-lg">{b.title}</span>
                <span className="sr-only">
                  ({b.fileType}, {b.sizeLabel})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open?.title ?? "Brochure"} className="max-w-[960px]">
        {open &&
          (viewable(open) ? (
            <div className="h-[75vh] overflow-hidden rounded-xl border border-line bg-surface" onContextMenu={(e) => e.preventDefault()}>
              <iframe src={`${open.url}${VIEW_ONLY}`} title={open.title} className="size-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FileText className="size-10 text-subtle" aria-hidden />
              <p className="text-sm text-muted">A preview of this brochure isn&apos;t available yet.</p>
            </div>
          ))}
      </Dialog>
    </section>
  );
}
