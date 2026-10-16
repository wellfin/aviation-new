/**
 * Demo content for the Ultra Pro profile tabs (Figma "Ultra Pro Details Page"):
 *   npm run seed:ultra
 * - Certification: WYVERN, ARGUS, IS-BAO and Other Certificate, each with a sample certificate image.
 * - Aircraft Fleet: an exterior jet photo on every fleet card.
 * - Reviews: four approved sample testimonials, only where the listing has no reviews yet.
 * Only demo listings (no owning provider account) are touched. Sample reviews use
 * `@demo.example` emails, so they can be removed with: Review.deleteMany({ authorEmail: /@demo\.example$/ }).
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Provider } from "../modules/providers/provider.model.js";
import { Review } from "../modules/reviews/review.model.js";

const CERTIFICATIONS = [
  { name: "WYVERN", issuer: "Wyvern Ltd.", validUntil: "2027-12-31", code: "WYV-WINGMAN-2209", image: "/images/certificates/wyvern.png" },
  { name: "ARGUS", issuer: "ARGUS International", validUntil: "2027-06-30", code: "ARG-PLAT-8812", image: "/images/certificates/argus.png" },
  { name: "ISBAO", issuer: "IBAC", validUntil: "2027-11-30", code: "ISBAO-3-20931", image: "/images/certificates/isbao.png" },
  { name: "OTHER CERTIFICATE", issuer: "Civil Aviation Authority", validUntil: "2028-01-31", code: "AOC-2291", image: "/images/certificates/other.png" },
];

const SAMPLE_REVIEWS = [
  {
    authorName: "Captain David Osei",
    authorRole: "Fleet Director",
    rating: 5,
    body: "We operate a fleet based in Dubai and Cape Town and were looking for better reach into the international broker market. Within the first few weeks we had enquiries from brokers across Europe and Asia.",
  },
  {
    authorName: "Rajesh Verma",
    authorRole: "Helicopter Operations Manager",
    rating: 5,
    body: "Before listing here we relied mostly on word of mouth and a few broker relationships. Since then we've had wedding bookings, pilgrimage requests and corporate charters from clients we would never have reached on our own.",
  },
  {
    authorName: "Sophie Laurent",
    authorRole: "Flight Department Coordinator",
    rating: 5,
    body: "Quick, professional handling on every visit. The team arranged fuel, catering and crew transport at short notice and kept us informed throughout.",
  },
  {
    authorName: "Michael Brennan",
    authorRole: "Chief Pilot",
    rating: 4,
    body: "Reliable service and a friendly ramp team. Turnarounds were smooth and the crew lounge was a welcome break on a long duty day.",
  },
];

await connectDatabase();
try {
  const listings = await Provider.find({ tier: "ultra_pro", owner: { $exists: false } }, { _id: 1, slug: 1 });
  let certs = 0;
  let reviewed = 0;
  for (const p of listings) {
    await Provider.updateOne({ _id: p._id }, { $set: { certifications: CERTIFICATIONS, "fleet.$[].image": "/images/home/ad-signature-jet.jpg" } });
    certs++;
    if (await Review.exists({ provider: p._id })) continue;
    const base = Date.now();
    await Review.insertMany(
      SAMPLE_REVIEWS.map((r, i) => ({
        ...r,
        provider: p._id,
        authorEmail: `reviewer${i + 1}.${p.slug}@demo.example`,
        title: "",
        status: "approved",
        createdAt: new Date(base - i * 86_400_000),
      })),
    );
    reviewed++;
  }
  // The header's rating and review count keep their demo values (not recomputed from these samples).
  logger.info({ listings: listings.length, certifications: certs, withSampleReviews: reviewed }, "Ultra Pro demo content seeded");
} finally {
  await disconnectDatabase();
}
