import { logger } from "../../lib/logger.js";
import { AdFormat } from "./ad-format.model.js";

/** Ad products from the Figma Advertise page. Inserted only if missing — admin edits are kept. */
const FORMATS = [
  { key: "header-banner", icon: "🖥️", title: "Header Banner", description: "Full-width banner above the fold on all pages" },
  { key: "sidebar", icon: "📌", title: "Sidebar Ads", description: "Sticky sidebar placement on directory & airport pages" },
  { key: "sponsored-cards", icon: "🎯", title: "Sponsored Cards", description: "Featured placement in search results & directory listings" },
  { key: "airport-page", icon: "✈️", title: "Airport Page Ads", description: "Exclusive placement on specific airport profile pages" },
  { key: "video", icon: "🎥", title: "Video Ads", description: "Pre-roll video on airport and provider profile pages" },
  { key: "newsletter", icon: "📬", title: "Newsletter Ads", description: "Dedicated placement in our weekly aviation intelligence newsletter" },
];

export async function seedAdFormats(): Promise<void> {
  const res = await AdFormat.bulkWrite(
    FORMATS.map((f, i) => ({ updateOne: { filter: { key: f.key }, update: { $setOnInsert: { ...f, order: (i + 1) * 10, active: true } }, upsert: true } })),
  );
  logger.info({ inserted: res.upsertedCount }, "Seeded ad formats");
}
