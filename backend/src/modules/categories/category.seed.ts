import { logger } from "../../lib/logger.js";
import { ServiceCategory } from "./category.model.js";
import { invalidateCategoryCache } from "./category.service.js";

/**
 * Initial catalogue, in the Figma directory order (9 filter pills, then the
 * "More Services" menu). Inserted only if missing — admin edits are kept.
 */
const CATEGORIES = [
  { slug: "fbo", name: "FBO", longName: "Fixed Base Operator", icon: "building", description: "Fixed Base Operators — fuel, hangars & crew lounges", emoji: "✈️" },
  { slug: "ground-handler", name: "Ground Handler", longName: "Ground Handling Agent", icon: "plane", description: "Ramp, baggage and passenger handling on arrival and departure", emoji: "🛄" },
  { slug: "trip-support", name: "Trip Support", longName: "Trip Support Provider", icon: "globe", description: "Flight planning, permits, slots and 24/7 operations support", emoji: "🌍" },
  { slug: "permit", name: "Permit", longName: "Permits & Overflight", icon: "file-check", description: "Overflight and landing permits processed worldwide", emoji: "📋" },
  { slug: "fuel", name: "Fuel", longName: "Fuel Supplier", icon: "fuel", description: "Jet A-1 and Avgas suppliers with into-plane fuelling", emoji: "⛽" },
  { slug: "catering", name: "Catering", longName: "In-flight Catering", icon: "utensils", description: "In-flight catering for business and VIP flights", emoji: "🍽️" },
  { slug: "ground-transportation", name: "Ground Transportation", longName: "Ground Transportation", icon: "car", description: "Chauffeured airside and landside crew & passenger transfers", emoji: "🚘" },
  { slug: "charter-operator", name: "Charter Operator", longName: "Air Charter Operator", icon: "plane-takeoff", description: "AOC holders operating private jet charter flights", emoji: "🛩️" },
  { slug: "supervisory-agent", name: "Supervisory Agent", longName: "Supervisory Agent", icon: "user-check", description: "Independent supervision of third-party ground handling", emoji: "🧑‍✈️" },
  { slug: "meet-and-assist", name: "Meet and Assist Service", longName: "Meet & Assist Service", icon: "handshake", description: "Fast-track, lounge access and personal terminal escorts", emoji: "🤝" },
  { slug: "charter-broker", name: "Charter Broker", longName: "Air Charter Broker", icon: "file-text", description: "Brokers sourcing the right aircraft for every mission", emoji: "📑" },
  { slug: "hotels", name: "Hotels", longName: "Crew & Passenger Hotels", icon: "hotel", description: "Crew and passenger hotels close to the airport", emoji: "🏨" },
  { slug: "mro", name: "MRO", longName: "Maintenance, Repair & Overhaul", icon: "wrench", description: "Line & base maintenance, repair and overhaul", emoji: "🔧" },
  { slug: "other-services", name: "Other Services", longName: "Other Aviation Services", icon: "grid", description: "Specialist aviation services not listed elsewhere", emoji: "🧩" },
];

export async function seedCategories(): Promise<void> {
  const res = await ServiceCategory.bulkWrite(
    [
      ...CATEGORIES.map((c, i) => ({
        updateOne: { filter: { slug: c.slug }, update: { $setOnInsert: { ...c, order: (i + 1) * 10, active: true, showInMenu: true } }, upsert: true },
      })),
      // Fill in descriptions only where none was ever set (admin edits win).
      ...CATEGORIES.map((c) => ({
        updateOne: { filter: { slug: c.slug, $or: [{ description: "" }, { description: { $exists: false } }] }, update: { $set: { description: c.description } } },
      })),
    ],
  );
  invalidateCategoryCache();
  logger.info({ inserted: res.upsertedCount }, "Seeded service categories");
}
