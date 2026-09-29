import Link from "next/link";
import type { ReactNode } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getAdvertisement } from "@/lib/data/content";
import { cn } from "@/lib/utils";

export const QUICK_PICKS = ["EGLL", "OMDB", "KJFK", "WSSS", "EDDF"] as const;

export interface QuickPick {
  label: string;
  href: string;
  active?: boolean;
}

/** Default quick-pick chips linking the current tool to the five showcase airports. */
export function icaoQuickPicks(path: string, current?: string, extra?: Record<string, string>): QuickPick[] {
  return QUICK_PICKS.map((code) => ({
    label: code,
    href: `${path}?${new URLSearchParams({ icao: code, ...extra }).toString()}`,
    active: current === code,
  }));
}

/**
 * Shared frame for every aviation tool page: header ad, navy hero (breadcrumb, title,
 * search form, quick picks), light content area, footer ad.
 */
export async function ToolLayout({
  title,
  subtitle,
  crumb,
  form,
  quickPicks,
  children,
}: {
  title: string;
  subtitle: string;
  /** Last breadcrumb label; omit on the tools index. */
  crumb?: string;
  form?: ReactNode;
  quickPicks?: QuickPick[];
  children: ReactNode;
}) {
  const ad = await getAdvertisement("header-banner");
  const crumbs = [{ label: "Home", href: "/" }, { label: "Aviation Tools", href: crumb ? "/tools" : undefined }];
  if (crumb) crumbs.push({ label: crumb, href: undefined });

  return (
    <>
      <div className="bg-white py-6">
        <AdBanner ad={ad} height="h-[110px] sm:h-[150px]" />
      </div>

      <section className="bg-header-gradient px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-14">
        <div className="mx-auto max-w-[1400px]">
          <Breadcrumbs items={crumbs} className="gap-1.5 pb-6 text-xs" />
          <h1 className="text-center text-[28px] leading-10 font-extrabold tracking-[-0.72px] text-white sm:text-[36px]">{title}</h1>
          <p className="mx-auto mt-3 max-w-[500px] text-center text-[15px] leading-6 text-white/60 sm:text-base">{subtitle}</p>
          {form && <div className="mt-6">{form}</div>}
          {quickPicks && quickPicks.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Quick picks">
              {quickPicks.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    aria-current={q.active ? "page" : undefined}
                    className={cn(
                      "inline-flex rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                      q.active
                        ? "border-brand-cyan/60 bg-brand-cyan/15 text-brand-cyan"
                        : "border-white/12 bg-white/8 text-white/70 hover:bg-white/15 hover:text-white",
                    )}
                  >
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="bg-surface">
        <div className="container-site py-8">{children}</div>
        <div className="pb-6">
          <AdBanner ad={ad} height="h-[140px] sm:h-[222px]" />
        </div>
      </div>
    </>
  );
}
