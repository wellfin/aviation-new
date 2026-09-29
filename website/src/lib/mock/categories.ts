import type { ServiceCategory } from "@/lib/types";

/** Demo catalogue used when DATA_SOURCE=mock (the API serves the admin-managed list otherwise). */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { slug: "fbo", name: "FBO", longName: "Fixed Base Operator", icon: "building", emoji: "✈️", showInMenu: true },
  { slug: "ground-handler", name: "Ground Handler", longName: "Ground Handling Agent", icon: "plane", emoji: "🛄", showInMenu: true },
  { slug: "trip-support", name: "Trip Support", longName: "Trip Support Provider", icon: "globe", emoji: "🌍", showInMenu: true },
  { slug: "permit", name: "Permit", longName: "Permits & Overflight", icon: "file-check", emoji: "📋", showInMenu: true },
  { slug: "fuel", name: "Fuel", longName: "Fuel Supplier", icon: "fuel", emoji: "⛽", showInMenu: true },
  { slug: "catering", name: "Catering", longName: "In-flight Catering", icon: "utensils", emoji: "🍽️", showInMenu: true },
  { slug: "ground-transportation", name: "Ground Transportation", longName: "Ground Transportation", icon: "car", emoji: "🚘", showInMenu: true },
  { slug: "charter-operator", name: "Charter Operator", longName: "Air Charter Operator", icon: "plane-takeoff", emoji: "🛩️", showInMenu: true },
  { slug: "supervisory-agent", name: "Supervisory Agent", longName: "Supervisory Agent", icon: "user-check", emoji: "🧑‍✈️", showInMenu: true },
  { slug: "meet-and-assist", name: "Meet and Assist Service", longName: "Meet & Assist Service", icon: "handshake", emoji: "🤝", showInMenu: true },
  { slug: "charter-broker", name: "Charter Broker", longName: "Air Charter Broker", icon: "file-text", emoji: "📑", showInMenu: true },
  { slug: "hotels", name: "Hotels", longName: "Crew & Passenger Hotels", icon: "hotel", emoji: "🏨", showInMenu: true },
  { slug: "mro", name: "MRO", longName: "Maintenance, Repair & Overhaul", icon: "wrench", emoji: "🔧", showInMenu: true },
  { slug: "other-services", name: "Other Services", longName: "Other Aviation Services", icon: "grid", emoji: "🧩", showInMenu: true },
];
