import type { z } from "zod";
import { withTransaction } from "../../lib/db.js";
import { AppError, badRequest, conflict, notFound, validationError } from "../../lib/errors.js";
import { recountAirportServices } from "../airports/airports.service.js";
import { Provider } from "../providers/provider.model.js";
import { icaosOf } from "../providers/providers.service.js";
import { ServiceCategory, toCategoryDTO, type CategoryDTO } from "./category.model.js";
import type { createCategoryBody, updateCategoryBody } from "./category.schemas.js";

/*
 * Active slugs are read on every provider write; cache them briefly and
 * invalidate on any catalogue change so validation never lags an admin edit
 * on this instance (other instances converge within the TTL).
 */
const CACHE_TTL_MS = 30_000;
let cache: { slugs: Set<string>; at: number } | null = null;

export function invalidateCategoryCache(): void {
  cache = null;
}

async function activeSlugs(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.slugs;
  const rows = await ServiceCategory.find({ active: true }).select("slug").lean();
  cache = { slugs: new Set(rows.map((r) => r.slug)), at: Date.now() };
  return cache.slugs;
}

/** Throws a field error unless `slug` is an active category. */
export async function assertActiveCategory(slug: string, field = "category"): Promise<void> {
  if (!(await activeSlugs()).has(slug)) throw validationError({ [field]: "Choose a valid service category" });
}

/** Active categories in display order, with the number of published providers in each. */
export async function listPublicCategories(): Promise<Array<CategoryDTO & { providerCount: number }>> {
  const [rows, counts] = await Promise.all([
    ServiceCategory.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Provider.aggregate<{ _id: string; n: number }>([{ $match: { status: "published" } }, { $group: { _id: "$category", n: { $sum: 1 } } }]),
  ]);
  const bySlug = new Map(counts.map((c) => [c._id, c.n]));
  return rows.map((r) => ({ ...toCategoryDTO(r), providerCount: bySlug.get(r.slug) ?? 0 }));
}

export async function listAllCategories(active?: boolean): Promise<Array<CategoryDTO & { providerCount: number }>> {
  const filter = active === undefined ? {} : { active };
  const [rows, counts] = await Promise.all([
    ServiceCategory.find(filter).sort({ order: 1, name: 1 }).lean(),
    Provider.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$category", n: { $sum: 1 } } }]),
  ]);
  const bySlug = new Map(counts.map((c) => [c._id, c.n]));
  return rows.map((r) => ({ ...toCategoryDTO(r), providerCount: bySlug.get(r.slug) ?? 0 }));
}

export async function createCategory(input: z.infer<typeof createCategoryBody>): Promise<CategoryDTO> {
  if (await ServiceCategory.exists({ slug: input.slug })) throw conflict("A category with this slug already exists.", { slug: "Already exists" });
  const order = input.order ?? ((await ServiceCategory.findOne().sort({ order: -1 }).select("order").lean())?.order ?? 0) + 10;
  const created = await ServiceCategory.create({ ...input, order });
  invalidateCategoryCache();
  return toCategoryDTO(created);
}

export async function updateCategory(slug: string, input: z.infer<typeof updateCategoryBody>): Promise<CategoryDTO> {
  const category = await ServiceCategory.findOne({ slug });
  if (!category) throw notFound("Category");
  const { deactivateListings, ...fields } = input;
  const turningOff = fields.active === false && category.active;
  const turningOn = fields.active === true && !category.active;
  if (turningOff && !deactivateListings) {
    const inUse = await Provider.countDocuments({ category: slug, status: "published" });
    if (inUse > 0) {
      throw new AppError(
        409,
        "CATEGORY_IN_USE",
        `${inUse} published listing${inUse === 1 ? " uses" : "s use"} this service. Deactivating it will also make ${inUse === 1 ? "that listing" : "those listings"} inactive.`,
      );
    }
  }
  await withTransaction(async (session) => {
    // Sequential: operations within one transaction must not run concurrently.
    let touched: string[] = [];
    if (turningOff || turningOn) {
      const match = turningOff
        ? { category: slug, status: "published" as const }
        : { category: slug, status: "suspended" as const, suspendedByCategory: true };
      const listings = await Provider.find(match).select("airportCodes").session(session).lean();
      touched = icaosOf(listings.flatMap((l) => l.airportCodes ?? []));
      if (listings.length) {
        await Provider.updateMany(
          { _id: { $in: listings.map((l) => l._id) } },
          turningOff ? { $set: { status: "suspended", suspendedByCategory: true } } : { $set: { status: "published" }, $unset: { suspendedByCategory: 1 } },
          { session },
        );
      }
    }
    category.set(fields);
    await category.save({ session });
    if (touched.length) await recountAirportServices(touched, session);
  });
  invalidateCategoryCache();
  return toCategoryDTO(category);
}

export async function deleteCategory(slug: string): Promise<void> {
  const inUse = await Provider.countDocuments({ category: slug });
  if (inUse > 0) throw new AppError(409, "CATEGORY_IN_USE", `${inUse} listing${inUse === 1 ? " uses" : "s use"} this category. Reassign or deactivate instead.`);
  const res = await ServiceCategory.deleteOne({ slug });
  if (res.deletedCount === 0) throw notFound("Category");
  invalidateCategoryCache();
}

/** Persists a new display order in one transaction; every slug must exist. */
export async function reorderCategories(slugs: string[]): Promise<void> {
  if (new Set(slugs).size !== slugs.length) throw badRequest("Duplicate categories in order list.");
  await withTransaction(async (session) => {
    const found = await ServiceCategory.countDocuments({ slug: { $in: slugs } }).session(session);
    if (found !== slugs.length) throw badRequest("Unknown category in order list.");
    await ServiceCategory.bulkWrite(
      slugs.map((slug, i) => ({ updateOne: { filter: { slug }, update: { $set: { order: (i + 1) * 10 } } } })),
      { session },
    );
  });
}
