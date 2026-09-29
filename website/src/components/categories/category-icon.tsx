import { createElement } from "react";
import {
  Building2,
  Car,
  FileCheck,
  FileText,
  Fuel,
  Globe,
  Handshake,
  Hotel,
  LayoutGrid,
  Plane,
  PlaneTakeoff,
  Shield,
  Stamp,
  UserCheck,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons admins can choose for a service category (by lucide name).
 * Unknown names fall back to a neutral grid icon.
 */
const ICONS: Record<string, LucideIcon> = {
  building: Building2,
  plane: Plane,
  globe: Globe,
  "file-check": FileCheck,
  stamp: Stamp,
  fuel: Fuel,
  utensils: UtensilsCrossed,
  car: Car,
  "plane-takeoff": PlaneTakeoff,
  "file-text": FileText,
  "user-check": UserCheck,
  wrench: Wrench,
  handshake: Handshake,
  hotel: Hotel,
  shield: Shield,
};

export function categoryIcon(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || LayoutGrid;
}

/** Renders the icon chosen for a category (by lucide name). */
export function CategoryIcon({ name, className }: { name: string | undefined; className?: string }) {
  return createElement(categoryIcon(name), { className, "aria-hidden": true });
}
