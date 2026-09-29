"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "../Dialog";
import { CARD, CARD_TITLE } from "../styles";

export function GalleryTab({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;
  const step = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section className={`${CARD} p-6`} aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className={CARD_TITLE}>
        Photo Gallery
      </h2>
      {count === 0 ? (
        <p className="mt-4 text-sm text-muted">No photos uploaded yet.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="group relative mt-6 block aspect-[845/528] w-full overflow-hidden rounded-[12px] bg-surface"
            aria-label={`Open photo ${index + 1} of ${count} full screen`}
          >
            <Image src={images[index] ?? images[0] ?? ""} alt={`${name} — photo ${index + 1}`} fill sizes="(max-width: 1024px) 100vw, 845px" className="object-cover" />
            <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Expand className="size-4" aria-hidden />
            </span>
          </button>
          <ul className="scrollbar-none mt-4 flex gap-2 overflow-x-auto" aria-label="Choose photo">
            {images.map((src, i) => (
              <li key={src} className="w-[calc((100%-24px)/4)] min-w-[88px] shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === index}
                  className={cn(
                    "relative block aspect-[205/211] w-full overflow-hidden rounded-[12px] border-[1.5px] transition",
                    i === index ? "border-brand-cyan" : "border-transparent opacity-85 hover:opacity-100",
                  )}
                >
                  <Image src={src} alt="" fill sizes="210px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={zoomed} onClose={() => setZoomed(false)} title={`${name} photo gallery`} tone="bare" className="max-w-[1100px]">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[20px] bg-navy-950">
          <Image src={images[index] ?? images[0] ?? ""} alt={`${name} — photo ${index + 1}`} fill sizes="1100px" className="object-contain" />
          {count > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 font-mono text-xs text-white">
            {index + 1} / {count}
          </p>
        </div>
      </Dialog>
    </section>
  );
}
