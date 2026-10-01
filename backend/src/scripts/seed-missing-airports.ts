/**
 * Adds demo and neighbouring airports that are not in the database yet:
 *   npm run seed:airports
 * Existing airports are never modified, so staff edits are safe.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { seedMissingAirports } from "../modules/airports/airports.seed.js";

await connectDatabase();
try {
  const added = await seedMissingAirports();
  logger.info({ added }, added.length ? "Airports added" : "No airports were missing");
} finally {
  await disconnectDatabase();
}
