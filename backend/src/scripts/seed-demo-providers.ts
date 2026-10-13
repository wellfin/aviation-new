/**
 * Adds the demo Pro and Basic FBO listings that are missing (so airport FBO lists show all three plans):
 *   npm run seed:providers
 * Existing listings are never modified.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { seedMissingProviders } from "../modules/providers/providers.seed.js";

await connectDatabase();
try {
  const added = await seedMissingProviders();
  logger.info({ added }, added.length ? "Providers added" : "No providers were missing");
} finally {
  await disconnectDatabase();
}
