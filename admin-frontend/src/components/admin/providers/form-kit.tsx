"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FieldError } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { siteUrl } from "@/components/admin/news/site";
import { UPLOAD_ACCEPT, uploadFile, type UploadedFile, type UploadKind } from "./upload";

/* ─────────────── Layout ─────────────── */

export function FormSection({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 id={id ? `${id}-title` : undefined} className="text-base font-bold text-ink">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3", cols === 4 && "sm:grid-cols-2 lg:grid-cols-4")}>{children}</div>;
}

export function Toggle({ label, description, checked, onChange, id }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
      <span className="text-sm">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

/* ─────────────── Repeater ─────────────── */

/** Editable list of objects with add / remove / reorder. */
export function Repeater<T>({
  items,
  onChange,
  create,
  max,
  addLabel,
  itemLabel,
  error,
  errorId,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  max: number;
  addLabel: string;
  itemLabel: (item: T, index: number) => string;
  error?: string;
  errorId: string;
  children: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">None added yet.</p>}
      {items.map((item, i) => (
        <fieldset key={i} className="rounded-xl border border-line bg-surface/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <legend className="text-sm font-bold text-ink">{itemLabel(item, i)}</legend>
            <div className="flex gap-1">
              <IconButton label={`Move ${itemLabel(item, i)} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton label={`Move ${itemLabel(item, i)} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton label={`Remove ${itemLabel(item, i)}`} danger onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          </div>
          {children(item, i, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))))}
        </fieldset>
      ))}
      <FieldError id={errorId} message={error} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={items.length >= max}
          onClick={() => onChange([...items, create()])}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-40"
        >
          <Plus className="size-4" /> {addLabel}
        </button>
        <span className="text-xs text-subtle">
          {items.length} / {max}
        </span>
      </div>
    </div>
  );
}

export function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("flex size-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-30", danger ? "text-danger hover:bg-danger/5" : "text-muted hover:bg-surface")}
    >
      {children}
    </button>
  );
}

/* ─────────────── Uploads ─────────────── */

/** URL field with an upload button (POST /admin/uploads) and a preview. */
export function UploadField({
  id,
  label,
  kind,
  value,
  onChange,
  onUploaded,
  error,
  hint,
  previewClassName = "aspect-video w-40",
}: {
  id: string;
  label: string;
  kind: UploadKind;
  value: string;
  onChange: (url: string) => void;
  onUploaded?: (file: UploadedFile) => void;
  error?: string;
  hint?: string;
  previewClassName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const shownError = uploadError || error;
  const errId = `${id}-error`;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError("");
    try {
      const uploaded = await uploadFile(kind, file);
      onChange(uploaded.url);
      onUploaded?.(uploaded);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.body.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        {label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {kind === "image" && (
          <div className={cn("relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface", previewClassName)}>
            {value ? <Image src={siteUrl(value)} alt="" fill unoptimized sizes="160px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-xs text-subtle">No image</span>}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={kind === "image" ? "/images/… or https://…" : "https://… (PDF)"}
            maxLength={500}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errId : undefined}
            className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT[kind]} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {busy ? "Uploading…" : `Upload ${kind === "image" ? "image" : "PDF"}`}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-danger">
                <X className="size-4" /> Clear
              </button>
            )}
            {kind === "document" && value && (
              <a href={siteUrl(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                <FileText className="size-4" /> Open
              </a>
            )}
          </div>
          {hint && !shownError && <p className="text-xs text-subtle">{hint}</p>}
          <FieldError id={errId} message={shownError} />
        </div>
      </div>
    </div>
  );
}

/** Grid of image URLs with multi-upload. */
export function GalleryEditor({ images, onChange, max, error, errorFor }: { images: string[]; onChange: (v: string[]) => void; max: number; error?: string; errorFor: (i: number) => string | undefined }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [url, setUrl] = useState("");
  const inputId = useId();

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, Math.max(0, max - images.length));
    setUploadError("");
    setBusy(list.length);
    const added: string[] = [];
    for (const f of list) {
      try {
        added.push((await uploadFile("image", f)).url);
      } catch (err) {
        setUploadError(`${f.name}: ${err instanceof ApiError ? err.body.message : "upload failed"}`);
      }
      setBusy((b) => b - 1);
    }
    if (added.length) onChange([...images, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No gallery images.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((src, i) => (
            <li key={`${src}-${i}`} className={cn("group relative aspect-[4/3] overflow-hidden rounded-xl border bg-surface", errorFor(i) ? "border-danger" : "border-line")}>
              <Image src={siteUrl(src)} alt={`Gallery image ${i + 1}`} fill unoptimized sizes="240px" className="object-cover" />
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <IconButton label={`Move image ${i + 1} earlier`} disabled={i === 0} onClick={() => onChange(swap(images, i, i - 1))}>
                  <ArrowUp className="size-4 -rotate-90" />
                </IconButton>
                <IconButton label={`Remove image ${i + 1}`} danger onClick={() => onChange(images.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              {errorFor(i) && <p className="absolute inset-x-0 bottom-0 bg-danger px-2 py-1 text-xs text-white">{errorFor(i)}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input ref={fileRef} type="file" multiple accept={UPLOAD_ACCEPT.image} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files)} />
        <button
          type="button"
          disabled={busy > 0 || images.length >= max}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          {busy > 0 ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy > 0 ? `Uploading ${busy}…` : "Upload images"}
        </button>
        <span className="text-xs text-subtle sm:mr-2">or</span>
        <label htmlFor={inputId} className="sr-only">
          Image URL
        </label>
        <input
          id={inputId}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an image URL"
          className="h-9 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          disabled={!url.trim() || images.length >= max}
          onClick={() => {
            onChange([...images, url.trim()]);
            setUrl("");
          }}
          className="h-9 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-40"
        >
          Add URL
        </button>
        <span className="text-xs text-subtle">
          {images.length} / {max}
        </span>
      </div>
      <FieldError id="gallery-error" message={uploadError || error} />
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/* ─────────────── Chips ─────────────── */

/** Free-text chips (Enter or comma adds). */
export function ChipInput({ id, label, values, onChange, max, maxLength, placeholder, error }: { id: string; label: string; values: string[]; onChange: (v: string[]) => void; max: number; maxLength: number; placeholder?: string; error?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().slice(0, maxLength);
    if (v && !values.includes(v) && values.length < max) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        {label}
      </label>
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
        {values.map((v) => (
          <Chip key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />
        ))}
        <input
          id={id}
          value={draft}
          maxLength={maxLength}
          placeholder={values.length >= max ? `Maximum ${max}` : placeholder}
          disabled={values.length >= max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={add}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="h-8 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
      {!error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">
          Press Enter to add.
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function Chip({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-brand/10 py-1 pr-1 pl-2.5 text-sm font-semibold text-brand">
      {label}
      {sub && <span className="font-normal text-muted">{sub}</span>}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="flex size-5 items-center justify-center rounded hover:bg-brand/15">
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/* ─────────────── Dialog ─────────────── */

const noopSubscribe = () => () => {};

/** Modal (native <dialog>: focus is trapped and restored) asking for a reason/note. */
export function ReasonDialog({
  open,
  title,
  description,
  label,
  required,
  minLength = 0,
  maxLength = 500,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  confirmLabel: string;
  onConfirm: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uid = useId();

  // Portalled to <body> so the dialog's form is never nested inside a page form.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={`${uid}-t`}
      onClose={() => {
        setText("");
        setError("");
        onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl p-0 shadow-card backdrop:bg-navy-950/50"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          // React events bubble through portals; keep this submit away from any enclosing form.
          e.stopPropagation();
          const v = text.trim();
          if ((required && !v) || v.length < minLength) return setError(minLength ? `Please write at least ${minLength} characters.` : "This is required.");
          setBusy(true);
          setError("");
          try {
            await onConfirm(v);
            ref.current?.close();
          } catch (err) {
            setError(err instanceof ApiError ? (err.body.fieldErrors?.reason ?? err.body.fieldErrors?.note ?? err.body.message) : "Something went wrong.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <h2 id={`${uid}-t`} className="text-lg font-bold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-r`} className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
            {label}
            {!required && " (optional)"}
          </label>
          <textarea
            id={`${uid}-r`}
            value={text}
            maxLength={maxLength}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-e` : undefined}
            className="min-h-28 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
          />
          <div className="mt-1 flex justify-between gap-2">
            <FieldError id={`${uid}-e`} message={error} />
            <span className="ml-auto text-xs text-subtle">
              {text.length}/{maxLength}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-muted hover:bg-surface">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
