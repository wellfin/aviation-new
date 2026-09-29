"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";

async function copy(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Text "Share" action used on news cards: native share sheet, falling back to copying the link. */
export function NewsShareButton({ title, path, className }: { title: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* share sheet dismissed */
      }
      return;
    }
    if (await copy(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button type="button" onClick={share} aria-label={copied ? "Link copied" : `Share “${title}”`} className={cn("text-xs leading-4 font-semibold text-brand hover:underline", className)}>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

/** Row of share targets for the article page. */
export function ArticleShareLinks({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = new URL(path, publicConfig.siteUrl).toString();
  const enc = encodeURIComponent;
  const targets = [
    { label: "in", name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: "𝕏", name: "X", href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}` },
    { label: "f", name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];
  const btn = "flex size-9 items-center justify-center rounded-[10px] border border-brand/20 bg-brand/6 text-sm font-bold text-brand transition hover:bg-brand/12";

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-[0.6px] text-muted uppercase">Share</span>
      {targets.map((t) => (
        <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${t.name}`} className={btn}>
          {t.label}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          if (await copy(new URL(path, window.location.origin).toString())) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        aria-label={copied ? "Link copied" : "Copy link"}
        className={btn}
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
