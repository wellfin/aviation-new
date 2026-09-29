import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProfileTab, TabDef } from "./profile-config";

/** Navy pill tab bar; each tab is a shareable `?tab=` link. */
export function ProfileTabs({ tabs, active, basePath, premiumLabel }: { tabs: TabDef[]; active: ProfileTab; basePath: string; premiumLabel: boolean }) {
  return (
    <nav aria-label="Profile sections" className="scrollbar-none overflow-x-auto rounded-[24px] border border-line bg-navy-900 p-1">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const current = t.id === active;
          return (
            <li key={t.id} className="flex-1">
              <Link
                href={t.id === "about" ? basePath : `${basePath}?tab=${t.id}`}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-[37px] items-center justify-center gap-1.5 rounded-[24px] px-5 text-sm font-semibold whitespace-nowrap text-white transition",
                  current ? "bg-brand-gradient" : "hover:bg-white/10",
                )}
              >
                {t.label}
                {premiumLabel && t.premium && (
                  <span className="rounded-full border border-warning/70 bg-black/40 px-1.5 text-[8px] leading-[13px] font-extrabold tracking-[0.4px] text-warning">ULTRA PRO</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
