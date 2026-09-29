"use client";

import { ImageIcon, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { imageFileError, uploadImage } from "./upload";
import { siteUrl } from "./site";

/**
 * Image reference field: paste a site path / URL, or upload a file to
 * `POST /admin/uploads` and use the returned URL. Shows a live preview.
 */
export function ImageUploadField({
  id,
  label = "Image",
  value,
  onChange,
  error,
  hint = "PNG, JPEG or WebP up to 5 MB — or paste a site path (/images/…) or https URL.",
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = imageFileError(file);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      onChange(uploaded.url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.body.message : "The upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const showPreview = value && broken !== value;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface sm:w-44">
        {showPreview ? (
          // Values may point at any host (API uploads, the public site, external URLs) — a plain preview avoids next/image host limits.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={siteUrl(value)} alt="Selected image preview" className="size-full object-cover" onError={() => setBroken(value)} />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-subtle">
            <ImageIcon className="size-6" aria-hidden />
            {value ? "Preview unavailable" : "No image"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Input id={id} name={id} label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error ?? uploadError ?? undefined} hint={hint} maxLength={500} placeholder="/images/news/example.jpg" />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id={`${id}-file`} tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={buttonClasses("outline", "sm", "mt-3")} aria-busy={uploading || undefined}>
          {uploading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
      </div>
    </div>
  );
}
