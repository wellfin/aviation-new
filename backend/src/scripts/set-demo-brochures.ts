/**
 * Points demo listings' placeholder brochures ("#") at the sample PDF the website serves, so the
 * Brochure tab has something to open:
 *   npx tsx --env-file-if-exists=.env src/scripts/set-demo-brochures.ts
 * Listings owned by a provider account are never touched.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Provider } from "../modules/providers/provider.model.js";

const SAMPLE = "/brochures/company-profile.pdf";

await connectDatabase();
try {
  const res = await Provider.updateMany(
    { owner: { $exists: false }, "brochures.url": "#" },
    { $set: { "brochures.$[b].url": SAMPLE, "brochures.$[b].fileType": "PDF" } },
    { arrayFilters: [{ "b.url": "#" }] },
  );
  logger.info({ updated: res.modifiedCount }, "Demo brochures set");
} finally {
  await disconnectDatabase();
}
