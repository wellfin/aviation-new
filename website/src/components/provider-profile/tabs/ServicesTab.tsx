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

/** Services Offered: compact name-only tiles (Figma Pro / Ultra Pro detail pages); the description shows on hover. */
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
        <ul className="mt-8 grid gap-1 sm:grid-cols-2">
          {provider.services.map((s, i) => {
            const Icon = ICONS[s.icon] ?? CircleEllipsis;
            const primary = i === 0;
            return (
              <li
                key={s.name}
                title={compact ? s.description : undefined}
                className={cn("flex gap-3 rounded-xl p-3", compact ? "items-center" : "items-start", primary ? "bg-brand-gradient text-white" : "border border-brand/10 bg-brand/4 text-ink")}
              >
                <Icon className={cn(!compact && "mt-px", "size-[18px] shrink-0", primary ? "text-white" : "text-muted")} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm leading-[18px] font-bold">{s.name}</p>
                  {!compact && <p className={cn("mt-0.5 text-xs leading-[18px]", primary ? "text-white/80" : "text-muted")}>{s.description}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
