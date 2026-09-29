"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import { EditorSection, move, PlanLock, RowControls, Thumb, UploadButton, UsageMeter, useSectionSave } from "./editor-kit";
import { mediaSchema } from "./schema";
import type { SectionProps } from "./TextSections";

const LABEL = "mb-1.5 text-xs font-semibold tracking-[0.6px] text-muted uppercase";

export function MediaSection({ listing, onSaved }: SectionProps) {
  const { limits } = listing;
  const [logo, setLogo] = useState(listing.logo);
  const [cover, setCover] = useState(listing.coverImage);
  const [gallery, setGallery] = useState<string[]>(listing.gallery);
  const [video, setVideo] = useState(listing.videoUrl ?? "");
  const { errors, saving, status, save, setErrors } = useSectionSave(mediaSchema, onSaved);
  const overLimit = gallery.length > limits.galleryImages;

  function submit() {
    if (overLimit) {
      setErrors({ gallery: `Your plan allows up to ${limits.galleryImages} gallery images. Remove ${gallery.length - limits.galleryImages} or upgrade.` });
      return;
    }
    // Only send the video when the plan allows it (the API rejects it otherwise).
    void save({ logo, coverImage: cover, gallery, ...(limits.video ? { videoUrl: video } : {}) });
  }

  return (
    <EditorSection id="media" title="Logo, photos & video" description="Images must be PNG, JPG or WebP." saving={saving} status={status} onSubmit={submit}>
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className={LABEL}>Logo</p>
          <div className="flex items-center gap-3">
            <Thumb src={logo} alt="Current logo" className="size-20 shrink-0 rounded-2xl border border-line" />
            <div className="space-y-1">
              <UploadButton kind="image" label={logo ? "Replace" : "Upload logo"} onUploaded={(f) => setLogo(f.url)} />
              {logo && (
                <button type="button" onClick={() => setLogo("")} className="text-xs font-semibold text-danger hover:underline">
                  Remove logo
                </button>
              )}
            </div>
          </div>
          {errors.logo && <p className="mt-1 text-xs text-danger">{errors.logo}</p>}
        </div>
        <div>
          <p className={LABEL}>Cover image</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Thumb src={cover} alt="Current cover image" className="aspect-[16/7] w-full shrink-0 rounded-2xl border border-line sm:w-72" />
            <div className="space-y-1">
              <UploadButton kind="image" label={cover ? "Replace cover" : "Upload cover"} onUploaded={(f) => setCover(f.url)} />
              {cover && (
                <button type="button" onClick={() => setCover("")} className="text-xs font-semibold text-danger hover:underline">
                  Remove cover
                </button>
              )}
            </div>
          </div>
          {errors.coverImage && <p className="mt-1 text-xs text-danger">{errors.coverImage}</p>}
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">Gallery</p>
          <UsageMeter used={gallery.length} max={limits.galleryImages} label="images" />
        </div>
        {errors.gallery && (
          <p role="alert" className="mb-3 text-sm font-medium text-danger">
            {errors.gallery}
          </p>
        )}
        {gallery.length > 0 && (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {gallery.map((src, i) => (
              <li key={`${src}-${i}`} className={i >= limits.galleryImages ? "rounded-xl ring-2 ring-danger" : undefined}>
                <Thumb src={src} alt={`Gallery image ${i + 1}`} className="aspect-[4/3] w-full rounded-xl border border-line" />
                <div className="mt-1.5 flex justify-end">
                  <RowControls index={i} count={gallery.length} label={`image ${i + 1}`} onMove={(a, b) => setGallery((g) => move(g, a, b))} onRemove={() => setGallery((g) => g.filter((_, j) => j !== i))} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {gallery.length >= limits.galleryImages ? (
          <PlanLock>
            Your plan includes {limits.galleryImages} gallery images{overLimit ? ` — remove ${gallery.length - limits.galleryImages} before saving` : ""}. Upgrade for more.
          </PlanLock>
        ) : (
          <UploadButton kind="image" multiple label="Add photos" onUploaded={(f) => setGallery((g) => (g.length < limits.galleryImages ? [...g, f.url] : g))} />
        )}
      </div>

      <div className="border-t border-line pt-5">
        {limits.video ? (
          <Input
            name="videoUrl"
            label="Profile video URL"
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            error={errors.videoUrl}
            maxLength={500}
            hint="A YouTube or Vimeo link shown on your profile."
            trailing={
              video ? (
                <button type="button" onClick={() => setVideo("")} aria-label="Clear video URL" className="flex size-7 items-center justify-center rounded-md text-subtle hover:text-ink">
                  <X className="size-4" aria-hidden />
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold tracking-[0.6px] text-muted uppercase">Profile video</p>
            <PlanLock>Profile videos are available on the Ultra Pro plan.</PlanLock>
          </>
        )}
      </div>
    </EditorSection>
  );
}
