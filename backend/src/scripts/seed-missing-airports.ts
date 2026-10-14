/**
 * Adds demo and neighbouring airports that are not in the database yet:
 *   npm run seed:airports
 * Existing airports are never replaced; blank "Airport Services" facility fields are filled
 * with typical values, and fields staff have filled in are left alone.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { fillAirportServiceDetails, seedMissingAirports } from "../modules/airports/airports.seed.js";

await connectDatabase();
try {
  const added = await seedMissingAirports();
  logger.info({ added }, added.length ? "Airports added" : "No airports were missing");
  await fillAirportServiceDetails();
} finally {
  await disconnectDatabase();
}
