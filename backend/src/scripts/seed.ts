/**
 * Loads the demo catalogue and content (idempotent upserts):
 *   npm run seed
 * Demo data only — no users or credentials are created here (see create-admin).
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { seedAdFormats } from "../modules/ad-formats/ad-format.seed.js";
import { seedAirports } from "../modules/airports/airports.seed.js";
import { seedCategories } from "../modules/categories/category.seed.js";
import { seedContent } from "../modules/news/content.seed.js";
import { seedProviders } from "../modules/providers/providers.seed.js";

await connectDatabase();
try {
  await seedCategories();
  await seedAirports();
  await seedProviders();
  await seedContent();
  await seedAdFormats();
  logger.info("Seed complete");
} finally {
  await disconnectDatabase();
}
