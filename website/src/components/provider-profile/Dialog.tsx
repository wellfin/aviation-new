"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element (focus trap, Esc to close and
 * inert background for free). Clicking the backdrop also closes it.
 */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  tone = "light",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "bare";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className={cn(
        "m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] overflow-hidden rounded-[20px] p-0 shadow-[0_24px_64px_rgba(7,20,35,0.35)] backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px]",
        tone === "bare" ? "bg-transparent shadow-none" : "bg-white",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          {tone === "light" ? (
            <div className="bg-header-gradient flex items-start justify-between gap-4 px-6 py-5 text-white">
              <div>
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
          )}
          <div className={cn("overflow-y-auto", tone === "light" && "p-6")}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
