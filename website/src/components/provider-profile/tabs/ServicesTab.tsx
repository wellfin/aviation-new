import {
  CircleEllipsis,
  Coffee,
  ConciergeBell,
  FileText,
  Fuel,
  Globe,
  House,
  Info,
  Store,
  Truck,
  UserCheck,
  Users,
  Wrench,
  HeartPulse,
  Plane,
  PlaneTakeoff,
  Settings,
  ShieldCheck,
  Sofa,
  Tag,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CARD, CARD_TITLE } from "../styles";

const ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  fuel: Fuel,
  sofa: Sofa,
  "shield-check": ShieldCheck,
  warehouse: Warehouse,
  "concierge-bell": ConciergeBell,
  "plane-takeoff": PlaneTakeoff,
  tag: Tag,
  settings: Settings,
  "heart-pulse": HeartPulse,
  // The 14 directory services as drawn in the Figma Services Offered card.
  building: Store,
  globe: Globe,
  coffee: Coffee,
  "user-check": UserCheck,
  users: Users,
  "file-text": FileText,
  truck: Truck,
  home: House,
  wrench: Wrench,
  info: Info,
};

/**
 * Services Offered: compact name-only tiles (Figma Pro / Ultra Pro detail pages); the description shows on hover.
 * The hovered tile turns blue; the first tile is blue while none is hovered.
 */
export function ServicesTab({ provider }: { provider: Provider }) {
  const compact = provider.tier !== "basic";
  return (
    <section className={`${CARD} p-6`} aria-labelledby="services-heading">
      <h2 id="services-heading" className={CARD_TITLE}>
        Services Offered
      </h2>
      {provider.services.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{provider.name} hasn&apos;t listed individual services yet.</p>
      ) : (
        <ul className="group/list mt-8 grid gap-1 sm:grid-cols-2">
          {provider.services.map((s, i) => {
            const Icon = ICONS[s.icon] ?? CircleEllipsis;
            const primary = i === 0;
            return (
              <li
                key={s.name}
                title={compact ? s.description : undefined}
                className={cn(
                  "group/item flex gap-3 rounded-xl border p-3 transition",
                  compact ? "items-center" : "items-start",
                  "hover:border-transparent hover:bg-brand-gradient hover:text-white",
                  primary
                    ? "border-transparent bg-brand-gradient text-white group-has-[li:hover]/list:not-hover:border-brand/10 group-has-[li:hover]/list:not-hover:bg-brand/4 group-has-[li:hover]/list:not-hover:bg-none group-has-[li:hover]/list:not-hover:text-ink"
                    : "border-brand/10 bg-brand/4 text-ink",
                )}
              >
                <Icon
                  className={cn(
                    !compact && "mt-px",
                    "size-[18px] shrink-0 group-hover/item:text-white",
                    primary ? "text-white group-has-[li:hover]/list:not-group-hover/item:text-muted" : "text-muted",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm leading-[18px] font-bold">{s.name}</p>
                  {!compact && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-[18px] group-hover/item:text-white/80",
                        primary ? "text-white/80 group-has-[li:hover]/list:not-group-hover/item:text-muted" : "text-muted",
                      )}
                    >
                      {s.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
