import request from "supertest";
import { describe, expect, it } from "vitest";
import { Provider } from "../src/modules/providers/provider.model.js";
import { providerReviewsRouter } from "../src/modules/reviews/review.routes.js";
import { Review } from "../src/modules/reviews/review.model.js";
import { appWith, ORIGIN, proveEmail } from "./helpers.js";

const app = appWith(["/providers", providerReviewsRouter]);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function makeProvider(slug: string) {
  return Provider.create({ slug, name: "Guest Review FBO", status: "published", tier: "pro", category: "fbo", countryCode: "GB", country: "United Kingdom", city: "London", summary: "FBO." });
}

function post(slug: string) {
  return request(app).post(`/api/v1/providers/${slug}/testimonials`).set("Origin", ORIGIN);
}

describe("guest testimonials (Share Your Experience)", () => {
  it("requires a verified email, stores the photo and waits for moderation", async () => {
    const p = await makeProvider("guest-review-1");
    const fields = { name: "David Osei", email: "david@example.com", company: "Fleet Director", rating: "5", body: "Fast enquiries and great support from the whole team." };

    const unverified = await post(p.slug).field(fields);
    expect(unverified.status).toBe(400);
    expect(unverified.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    await proveEmail("review_email", fields.email);
    const created = await post(p.slug).field(fields).attach("photo", PNG, { filename: "me.png", contentType: "image/png" });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ author: "David Osei", role: "Fleet Director", rating: 5, status: "pending" });
    expect(created.body.data.photo).toMatch(/\/api\/v1\/files\/.+\.png$/);

    const saved = await Review.findOne({ provider: p._id }).lean();
    expect(saved).toMatchObject({ authorEmail: "david@example.com", status: "pending" });
    expect(saved?.author).toBeUndefined();

    // Not public until approved; one testimonial per email per provider.
    expect((await request(app).get(`/api/v1/providers/${p.slug}/reviews`)).body.data.items).toHaveLength(0);
    await proveEmail("review_email", fields.email);
    expect((await post(p.slug).field(fields)).status).toBe(409);
  });

  it("rejects bad input and non-image photos", async () => {
    const p = await makeProvider("guest-review-2");
    const bad = await post(p.slug).field({ name: "D", email: "nope", rating: "9", body: "short" });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.fieldErrors)).toEqual(expect.arrayContaining(["name", "email", "rating", "body"]));

    await proveEmail("review_email", "anna@example.com");
    const notImage = await post(p.slug)
      .field({ name: "Anna Lee", email: "anna@example.com", rating: "4", body: "Lovely lounge and quick fuel turnaround." })
      .attach("photo", Buffer.from("<html>not an image</html>"), { filename: "x.png", contentType: "image/png" });
    expect(notImage.status).toBe(422);
    expect(notImage.body.error.fieldErrors).toHaveProperty("photo");
    expect(await Review.countDocuments({ provider: p._id })).toBe(0);
  });
});
