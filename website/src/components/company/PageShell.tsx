import type { ReactNode } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { getAdvertisement } from "@/lib/data/content";
import { cn } from "@/lib/utils";

/**
 * Frame shared by the company, help and legal pages: header ad, navy hero,
 * light content area and footer ad.
 */
export async function PageShell({ hero, children, contentClassName }: { hero: ReactNode; children: ReactNode; contentClassName?: string }) {
  const ad = await getAdvertisement("header-banner");
  return (
    <>
      <div className="bg-white py-6">
        <AdBanner ad={ad} height="h-[110px] sm:h-[150px]" />
      </div>
      {hero}
      <div className="bg-surface">
        <div className={cn("pb-12", contentClassName)}>{children}</div>
        <div className="pb-6">
          <AdBanner ad={ad} height="h-[140px] sm:h-[222px]" />
        </div>
      </div>
    </>
  );
}

/** Centered navy hero with optional breadcrumb trail (Request Demo, FAQ, Legal pages). */
export function PageHero({
  title,
  subtitle,
  crumbs,
  children,
  className,
  subtitleClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  children?: ReactNode;
  className?: string;
  subtitleClassName?: string;
}) {
  return (
    <section className={cn("bg-header-gradient relative overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(47,128,237,0.25),transparent_60%)]"
      />
      <div className="relative container-site pt-10 pb-12 sm:pt-14 sm:pb-16">
        {crumbs && <Breadcrumbs items={crumbs} className="gap-1.5 pb-6 text-xs sm:pb-10" />}
        <div className="mx-auto max-w-[820px] text-center">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.9px] text-white sm:text-[40px]">{title}</h1>
          {subtitle && <p className={cn("mx-auto mt-4 max-w-[600px] text-[15px] leading-6 text-white/60 sm:text-base", subtitleClassName)}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
