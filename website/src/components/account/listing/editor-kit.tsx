"use client";

import { ArrowDown, ArrowUp, ImagePlus, Lock, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import type { Listing } from "../types";
import { UPLOAD_RULES, uploadFile, type UploadKind } from "../upload";
import type { UploadResult } from "../types";

export type Errors = Record<string, string>;
type Status = { status: "success" | "error"; message: string } | null;

/**
 * Validates one editor section with its zod schema and PATCHes only those
 * fields to /me/listing, mapping API field errors back onto the section.
 */
export function useSectionSave<S extends z.ZodType>(schema: S, onSaved: (listing: Listing) => void) {
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function save(raw: unknown): Promise<boolean> {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setStatus({ status: "error", message: "Please fix the highlighted fields." });
      return false;
    }
    setErrors({});
    setStatus(null);
    setSaving(true);
    try {
      const updated = await apiRequest<Listing>("PATCH", "/me/listing", parsed.data);
      onSaved(updated);
      setStatus({ status: "success", message: "Saved." });
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        const first = err.body.fieldErrors ? Object.values(err.body.fieldErrors)[0] : undefined;
        setStatus({ status: "error", message: first && err.status === 422 ? first : err.body.message });
      } else {
        setStatus({ status: "error", message: "Couldn't save. Please try again." });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { errors, saving, status, save, setErrors };
}

/** Card-style editor section with its own form and save button. */
export function EditorSection({
  id,
  title,
  description,
  meta,
  children,
  onSubmit,
  saving,
  status,
  locked,
  saveLabel = "Save section",
}: {
  id: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  onSubmit: () => void;
  saving: boolean;
  status: Status;
  locked?: boolean;
  saveLabel?: string;
}) {
  function handle(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-36 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-bold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {meta}
      </div>
      <form onSubmit={handle} noValidate className="space-y-5">
        {children}
        {!locked && (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1" aria-live="polite">
              {status && <FormStatus status={status.status} message={status.message} />}
            </div>
            <Button type="submit" size="sm" loading={saving}>
              {saveLabel}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}

/** Explains a plan limit with an upgrade link. */
export function PlanLock({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/8 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-ink">
        <Lock className="mt-0.5 size-4 shrink-0 text-[#a16207]" aria-hidden />
        <span>{children}</span>
      </p>
      <ButtonLink href="/account/billing" size="sm" variant="outline" className="shrink-0">
        Upgrade plan
      </ButtonLink>
    </div>
  );
}

export function UsageMeter({ used, max, label }: { used: number; max: number; label: string }) {
  const over = used > max;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", over ? "bg-danger/10 text-danger" : used === max ? "bg-warning/15 text-[#a16207]" : "bg-surface text-muted")}>
      {used} / {max} {label}
    </span>
  );
}

/** Move up / move down / remove controls for repeatable rows. */
export function RowControls({ index, count, onMove, onRemove, label }: { index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void; label: string }) {
  const btn = "flex size-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:opacity-40";
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="size-4" aria-hidden />
      </button>
      <button type="button" className={cn(btn, "hover:border-danger/40 hover:text-danger")} onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/** Hidden file input + button that uploads to /uploads and reports the result. */
export function UploadButton({
  kind,
  onUploaded,
  label,
  disabled,
  multiple,
  variant = "outline",
}: {
  kind: UploadKind;
  onUploaded: (file: UploadResult) => void;
  label: string;
  disabled?: boolean;
  multiple?: boolean;
  variant?: "outline" | "ghost";
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        onUploaded(await uploadFile(kind, file));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input ref={input} id={id} type="file" accept={UPLOAD_RULES[kind].accept} multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => onChange(e.target.files)} />
      <Button type="button" variant={variant} size="sm" loading={busy} disabled={disabled} onClick={() => input.current?.click()}>
        {kind === "image" ? <ImagePlus className="size-4" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {busy ? "Uploading…" : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-subtle">{UPLOAD_RULES[kind].label}</p>
      )}
    </div>
  );
}

/** Preview for user-uploaded images (arbitrary origins, so not next/image). */
export function Thumb({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <span className={cn("flex items-center justify-center bg-surface text-subtle", className)}><ImagePlus className="size-5" aria-hidden /></span>;
  // eslint-disable-next-line @next/next/no-img-element -- uploaded files live on the API origin, which next/image isn't configured for
  return <img src={src} alt={alt} className={cn("object-cover", className)} />;
}
