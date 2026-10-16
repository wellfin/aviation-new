/**
 * Demo "Services Offered" for Pro / Ultra Pro FBO and service listings (Figma Pro / Ultra Pro detail
 * pages, services flow): the 14 directory services in the order drawn.
 *   npm run seed:services
 * Only demo listings (no owning provider account) that are not charter operators / brokers are touched.
 * The Send Enquiry "Select Service" list follows these services.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Provider } from "../modules/providers/provider.model.js";

const SERVICES = [
  { name: "FBO", icon: "building", description: "Private terminal, lounges and ramp services for business aviation." },
  { name: "Ground Handler", icon: "plane", description: "Aircraft handling, marshalling, baggage and turnaround." },
  { name: "Trip Support", icon: "globe", description: "Flight planning, weather, slots and 24/7 operations support." },
  { name: "Permit", icon: "plane", description: "Overflight and landing permits arranged worldwide." },
  { name: "Fuel", icon: "fuel", description: "Jet-A and Avgas supply with competitive pricing." },
  { name: "Catering", icon: "coffee", description: "In-flight catering prepared to your crew's order." },
  { name: "Supervisory Agent", icon: "user-check", description: "On-site supervision of third-party handling." },
  { name: "Meet and Assist Service", icon: "users", description: "Passenger meet & greet and fast-track assistance." },
  { name: "Charter Operators", icon: "plane", description: "Access to vetted charter operators for your trip." },
  { name: "Charter Brokers", icon: "file-text", description: "Charter brokerage and aircraft sourcing." },
  { name: "Ground Transportation", icon: "truck", description: "Chauffeured cars and crew transport." },
  { name: "Hotels", icon: "home", description: "Crew and passenger hotel bookings near the airport." },
  { name: "MRO", icon: "wrench", description: "Line maintenance and AOG support." },
  { name: "Other Services", icon: "info", description: "Customs, immigration, hangarage and more on request." },
];

await connectDatabase();
try {
  const res = await Provider.updateMany(
    { tier: { $in: ["pro", "ultra_pro"] }, owner: { $exists: false }, category: { $nin: ["charter-operator", "charter-broker"] } },
    { $set: { services: SERVICES } },
  );
  logger.info({ updated: res.modifiedCount }, "Demo service tiles seeded");
} finally {
  await disconnectDatabase();
}
