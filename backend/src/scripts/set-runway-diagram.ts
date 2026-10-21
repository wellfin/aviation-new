/**
 * Sets an airport's runway diagram image (served by the website):
 *   npx tsx --env-file-if-exists=.env src/scripts/set-runway-diagram.ts VIDP /images/airports/diagrams/vidp.png
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Airport } from "../modules/airports/airport.model.js";

const [icao, image] = process.argv.slice(2);
if (!icao || !image?.startsWith("/")) throw new Error("Usage: set-runway-diagram.ts <ICAO> </images/...png>");

await connectDatabase();
try {
  const res = await Airport.updateOne({ icao: icao.toUpperCase() }, { $set: { runwayDiagram: image } });
  logger.info({ icao, matched: res.matchedCount }, "Runway diagram set");
} finally {
  await disconnectDatabase();
}
