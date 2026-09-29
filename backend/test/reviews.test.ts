import type { Types } from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { Provider } from "../src/modules/providers/provider.model.js";
import { adminReviewsRouter, myReviewsRouter, providerReviewsRouter } from "../src/modules/reviews/review.routes.js";
import { Review } from "../src/modules/reviews/review.model.js";
import { User, type UserDoc } from "../src/modules/users/user.model.js";
import { appWith, createUser, ORIGIN, signedInAgent } from "./helpers.js";

const app = appWith(["/providers", providerReviewsRouter], ["/me/reviews", myReviewsRouter], ["/admin/reviews", adminReviewsRouter]);

let seq = 0;
async function makeProvider(overrides: Partial<{ status: "draft" | "published" | "suspended"; owner: UserDoc["_id"]; slug: string }> = {}) {
  seq += 1;
  return Provider.create({
    slug: overrides.slug ?? `jet-provider-${seq}`,
    name: `Jet Provider ${seq}`,
    status: overrides.status ?? "published",
    owner: overrides.owner,
    tier: "pro",
    category: "fbo",
    countryCode: "GB",
    country: "United Kingdom",
    city: "London",
    summary: "Premium FBO services.",
  });
}

const validReview = { rating: 4, title: "Great handling", body: "Smooth turnaround and friendly crew, would use again." };

async function reviewAs(role: "USER" | "PROVIDER" = "USER") {
  return signedInAgent(role, app);
}

/** Inserts a review directly with a given status (bypassing the API). */
async function seedReview(providerId: Types.ObjectId, rating: number, status: "pending" | "approved" | "rejected" = "pending", createdAt?: Date) {
  const author = await createUser();
  return Review.create({ provider: providerId, author: author._id, authorName: "Seed A.", rating, title: "Seeded review", body: "Seeded review body text that is long enough.", status, ...(createdAt ? { createdAt } : {}) });
}

describe("POST /providers/:slug/reviews", () => {
  it("creates a pending review with a privacy-safe author name", async () => {
    const provider = await makeProvider();
    const { agent, user } = await reviewAs();
    const r = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).set("Origin", ORIGIN).send({ ...validReview, role: "Chief Pilot" });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ rating: 4, title: "Great handling", role: "Chief Pilot", status: "pending", author: `Test ${user.lastName[0]}.` });
    expect(r.body.data.provider.slug).toBe(provider.slug);
    // Pending reviews are not public and don't move the aggregates.
    const pub = await request(app).get(`/api/v1/providers/${provider.slug}/reviews`);
    expect(pub.body.data.items).toHaveLength(0);
    const fresh = await Provider.findById(provider._id).lean();
    expect(fresh?.reviewCount).toBe(0);
  });

  it("requires sign-in", async () => {
    const provider = await makeProvider();
    expect((await request(app).post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview)).status).toBe(401);
  });

  it("requires a verified email", async () => {
    const provider = await makeProvider();
    // Sign-in itself requires verification, so un-verify an existing session's user.
    const { agent, user } = await reviewAs();
    await User.updateOne({ _id: user._id }, { $unset: { emailVerifiedAt: 1 } });
    const r = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("validates input with field errors", async () => {
    const provider = await makeProvider();
    const { agent } = await reviewAs();
    const r = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send({ rating: 6, title: "x", body: "short", role: "r".repeat(121) });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fieldErrors).sort()).toEqual(["body", "rating", "role", "title"]);
    expect((await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send({ ...validReview, rating: 3.5 })).status).toBe(422);
  });

  it("rejects duplicates with 409 DUPLICATE_REVIEW", async () => {
    const provider = await makeProvider();
    const { agent } = await reviewAs();
    expect((await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview)).status).toBe(201);
    const r = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("DUPLICATE_REVIEW");
  });

  it("stops concurrent duplicate submissions", async () => {
    const provider = await makeProvider();
    const { agent } = await reviewAs();
    const results = await Promise.all([1, 2, 3].map(() => agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await Review.countDocuments({ provider: provider._id })).toBe(1);
  });

  it("forbids owners reviewing their own listing", async () => {
    const { agent, user } = await reviewAs("PROVIDER");
    const provider = await makeProvider({ owner: user._id });
    expect((await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview)).status).toBe(403);
  });

  it("only accepts reviews for published providers", async () => {
    const draft = await makeProvider({ status: "draft" });
    const { agent } = await reviewAs();
    expect((await agent.post(`/api/v1/providers/${draft.slug}/reviews`).send(validReview)).status).toBe(404);
    expect((await agent.post(`/api/v1/providers/no-such-provider/reviews`).send(validReview)).status).toBe(404);
    expect((await agent.post(`/api/v1/providers/Bad%20Slug!/reviews`).send(validReview)).status).toBe(422);
  });
});

describe("GET /providers/:slug/reviews", () => {
  it("lists only approved reviews, newest first, paginated", async () => {
    const provider = await makeProvider();
    const other = await makeProvider();
    await seedReview(provider._id, 5, "approved", new Date("2026-01-01"));
    await seedReview(provider._id, 3, "approved", new Date("2026-03-01"));
    await seedReview(provider._id, 4, "approved", new Date("2026-02-01"));
    await seedReview(provider._id, 1, "pending");
    await seedReview(provider._id, 1, "rejected");
    await seedReview(other._id, 2, "approved");

    const r = await request(app).get(`/api/v1/providers/${provider.slug}/reviews?pageSize=2`);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
    expect(r.body.data.items.map((i: { rating: number }) => i.rating)).toEqual([3, 4]);
    expect(Object.keys(r.body.data.items[0]).sort()).toEqual(["author", "body", "date", "id", "rating", "role", "title"]);
    expect(r.body.data.items[0].date).toBe("2026-03-01T00:00:00.000Z");
    const p2 = await request(app).get(`/api/v1/providers/${provider.slug}/reviews?pageSize=2&page=2`);
    expect(p2.body.data.items.map((i: { rating: number }) => i.rating)).toEqual([5]);
  });

  it("returns an empty page and 404s unpublished providers", async () => {
    const provider = await makeProvider();
    const r = await request(app).get(`/api/v1/providers/${provider.slug}/reviews`);
    expect(r.body.data).toMatchObject({ items: [], total: 0, totalPages: 1 });
    const hidden = await makeProvider({ status: "suspended" });
    expect((await request(app).get(`/api/v1/providers/${hidden.slug}/reviews`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/providers/${provider.slug}/reviews?pageSize=1000`)).status).toBe(422);
  });
});

describe("my reviews", () => {
  it("lists own reviews with status and deletes them", async () => {
    const provider = await makeProvider();
    const { agent } = await reviewAs();
    const { agent: other } = await reviewAs();
    const created = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview);
    await other.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview);

    const mine = await agent.get("/api/v1/me/reviews");
    expect(mine.status).toBe(200);
    expect(mine.body.data.total).toBe(1);
    expect(mine.body.data.items[0]).toMatchObject({ status: "pending", provider: { slug: provider.slug, name: provider.name } });

    // Can't delete someone else's review.
    expect((await other.delete(`/api/v1/me/reviews/${created.body.data.id}`)).status).toBe(404);
    expect((await agent.delete(`/api/v1/me/reviews/${created.body.data.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/v1/me/reviews/${created.body.data.id}`)).status).toBe(404);
    expect((await agent.delete(`/api/v1/me/reviews/not-an-id`)).status).toBe(422);
  });

  it("requires sign-in", async () => {
    expect((await request(app).get("/api/v1/me/reviews")).status).toBe(401);
  });

  it("recomputes aggregates when deleting an approved review", async () => {
    const provider = await makeProvider();
    await seedReview(provider._id, 5, "approved");
    const { agent } = await reviewAs();
    const { agent: mod } = await signedInAgent("MANAGER", app);
    const created = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send({ ...validReview, rating: 2 });
    await mod.post(`/api/v1/admin/reviews/${created.body.data.id}/approve`);
    // Seeded review was inserted directly, so the first recompute establishes (5+2)/2.
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 3.5, reviewCount: 2 });
    expect((await agent.delete(`/api/v1/me/reviews/${created.body.data.id}`)).status).toBe(204);
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 5, reviewCount: 1 });
  });
});

describe("admin review moderation", () => {
  it("is restricted to moderators", async () => {
    const provider = await makeProvider();
    const review = await seedReview(provider._id, 4);
    expect((await request(app).get("/api/v1/admin/reviews")).status).toBe(401);
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get("/api/v1/admin/reviews")).status).toBe(401);
      expect((await agent.post(`/api/v1/admin/reviews/${review.id}/approve`)).status).toBe(401);
      expect((await agent.delete(`/api/v1/admin/reviews/${review.id}`)).status).toBe(401);
    }
  });

  it("lists with status/provider/q filters and pagination", async () => {
    const a = await makeProvider();
    const b = await makeProvider();
    await seedReview(a._id, 4, "pending");
    await seedReview(a._id, 5, "approved");
    await seedReview(b._id, 3, "pending");
    await Review.updateOne({ provider: b._id }, { $set: { title: "Fuel (was) slow" } });
    const { agent } = await signedInAgent("MANAGER", app);

    const pending = await agent.get("/api/v1/admin/reviews?status=pending");
    expect(pending.body.data.total).toBe(2);
    expect(pending.body.data.items[0]).toHaveProperty("authorId");
    expect((await agent.get(`/api/v1/admin/reviews?provider=${a.slug}`)).body.data.total).toBe(2);
    expect((await agent.get(`/api/v1/admin/reviews?provider=${String(b._id)}`)).body.data.total).toBe(1);
    const q = await agent.get("/api/v1/admin/reviews?q=(was)");
    expect(q.body.data.total).toBe(1);
    expect(q.body.data.items[0].provider.slug).toBe(b.slug);
    expect((await agent.get("/api/v1/admin/reviews?pageSize=1")).body.data).toMatchObject({ total: 3, totalPages: 3 });
    expect((await agent.get("/api/v1/admin/reviews?status=bogus")).status).toBe(422);
  });

  it("approves, rejects and deletes with exact aggregates", async () => {
    const provider = await makeProvider();
    const reviews = await Promise.all([5, 4, 4, 2].map((n) => seedReview(provider._id, n)));
    const { agent, user: mod } = await signedInAgent("MANAGER", app);

    // Approve all four concurrently — every transaction must see the others.
    const results = await Promise.all(reviews.map((r) => agent.post(`/api/v1/admin/reviews/${r.id}/approve`)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results[0]!.body.data).toMatchObject({ status: "approved", moderatedBy: mod.id });
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 3.75, reviewCount: 4 });

    // Reject one approved review (with note) → aggregates drop it.
    const rej = await agent.post(`/api/v1/admin/reviews/${reviews[3]!.id}/reject`).send({ note: "Off-topic" });
    expect(rej.body.data).toMatchObject({ status: "rejected", moderationNote: "Off-topic" });
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 13 / 3, reviewCount: 3 });

    // Delete one approved review → exact numbers.
    expect((await agent.delete(`/api/v1/admin/reviews/${reviews[0]!.id}`)).status).toBe(204);
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 4, reviewCount: 2 });

    // Deleting a rejected review leaves the aggregates untouched.
    expect((await agent.delete(`/api/v1/admin/reviews/${reviews[3]!.id}`)).status).toBe(204);
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 4, reviewCount: 2 });

    // Concurrent deletes of the remaining approved reviews → zeroed.
    await Promise.all([reviews[1]!, reviews[2]!].map((r) => agent.delete(`/api/v1/admin/reviews/${r.id}`)));
    expect(await Provider.findById(provider._id).lean()).toMatchObject({ rating: 0, reviewCount: 0 });
  });

  it("shows the rejection note to the author and hides rejected reviews", async () => {
    const provider = await makeProvider();
    const { agent } = await reviewAs();
    const { agent: mod } = await signedInAgent("ADMIN", app);
    const created = await agent.post(`/api/v1/providers/${provider.slug}/reviews`).send(validReview);
    await mod.post(`/api/v1/admin/reviews/${created.body.data.id}/reject`).send({ note: "Please remove personal details" });
    const mine = await agent.get("/api/v1/me/reviews");
    expect(mine.body.data.items[0]).toMatchObject({ status: "rejected", moderationNote: "Please remove personal details" });
    expect((await request(app).get(`/api/v1/providers/${provider.slug}/reviews`)).body.data.total).toBe(0);
  });

  it("404s unknown reviews and validates ids / note length", async () => {
    const { agent } = await signedInAgent("MANAGER", app);
    const missing = "0123456789abcdef01234567";
    expect((await agent.post(`/api/v1/admin/reviews/${missing}/approve`)).status).toBe(404);
    expect((await agent.delete(`/api/v1/admin/reviews/${missing}`)).status).toBe(404);
    expect((await agent.post(`/api/v1/admin/reviews/xyz/approve`)).status).toBe(422);
    const provider = await makeProvider();
    const review = await seedReview(provider._id, 3);
    expect((await agent.post(`/api/v1/admin/reviews/${review.id}/reject`).send({ note: "n".repeat(501) })).status).toBe(422);
  });
});
