import { logger } from "../../lib/logger.js";
import { AdFormat } from "./ad-format.model.js";

/** Ad products — one per placement the website renders. Inserted only if missing — admin edits are kept. */
const FORMATS = [
  { key: "header-banner", icon: "🖥️", title: "Header Banner", description: "Full-width banner at the top and bottom of the directory, airport, provider, news, tools and other key pages" },
  { key: "sidebar", icon: "📌", title: "Sidebar Ads", description: "Sponsor card beside charter, airport, provider, FAQ and news content" },
  { key: "sponsored-cards", icon: "🎯", title: "Sponsored Cards", description: "Featured strip between directory and charter results, plus sponsor cards on the home, charter and news pages" },
  { key: "sticky-footer", icon: "📢", title: "Sticky Footer", description: "Collapsible bar pinned to the bottom of every page on desktop" },
];

export async function seedAdFormats(): Promise<void> {
  const res = await AdFormat.bulkWrite(
    FORMATS.map((f, i) => ({ updateOne: { filter: { key: f.key }, update: { $setOnInsert: { ...f, order: (i + 1) * 10, active: true } }, upsert: true } })),
  );
  logger.info({ inserted: res.upsertedCount }, "Seeded ad formats");
}
