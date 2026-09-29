"use client";

import { Component, type ReactNode } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import type { Advertisement } from "@/lib/types";
import { siteUrl } from "@/components/admin/news/site";
import { isSafeAdHref, PLACEMENT_LABEL, type AdPlacement } from "./schema";

/** Falls back to a plain-image mock when the site component can't render (e.g. next/image rejects the image host). */
class PreviewBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function PlainImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}

/** Approximation used when the real component can't render the image. */
function FallbackPreview({ ad }: { ad: Advertisement }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl bg-navy-900">
        <PlainImage src={siteUrl(ad.image)} alt={ad.headline ?? ad.advertiser} className="h-auto max-h-56 w-full object-cover" />
      </div>
      <p className="text-xs text-muted">
        Simplified preview: this image&apos;s host isn&apos;t allowed for the site&apos;s image component (<code className="font-mono">images.remotePatterns</code> in{" "}
        <code className="font-mono">next.config</code>). Uploaded images always work.
      </p>
    </div>
  );
}

/** Renders the real site ad component for the chosen placement. Links inside are inert. */
export function AdPreview({ placement, ad }: { placement: AdPlacement; ad: Advertisement }) {
  const renderable = Boolean(ad.image) && (ad.image.startsWith("/") || /^https?:\/\//i.test(ad.image));
  // Site paths (/images/…) are rendered as-is: the console mirrors the site's ad creatives under /images/shared.
  const safe: Advertisement = { ...ad, href: isSafeAdHref(ad.href) ? ad.href : "#" };

  let content: ReactNode;
  if (!renderable) {
    content = <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Add an image to see the preview.</p>;
  } else if (placement === "sidebar") {
    content = <SidebarAd ad={safe} className="mx-auto min-h-[300px] w-full max-w-[435px]" />;
  } else if (placement === "sponsored-strip") {
    content = <SponsoredStrip ad={safe} />;
  } else if (placement === "sticky-footer") {
    // The live component is fixed to the viewport; show its creative at the same ratio instead.
    content = (
      <div className="overflow-hidden rounded-t-xl border border-b-0 border-line">
        <PlainImage src={siteUrl(safe.image)} alt={safe.advertiser} className="h-auto w-full" />
      </div>
    );
  } else {
    content = <AdBanner ad={safe} className="!px-0" />;
  }

  return (
    <figure className="flex flex-col gap-2">
      <div inert className="rounded-2xl bg-surface p-3">
        <PreviewBoundary key={`${placement}|${ad.image}`} fallback={<FallbackPreview ad={safe} />}>
          {content}
        </PreviewBoundary>
      </div>
      <figcaption className="text-xs text-muted">{PLACEMENT_LABEL[placement]} as it appears on the site.</figcaption>
    </figure>
  );
}
