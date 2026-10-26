import { isDuplicateKeyError } from "../../lib/db.js";
import { conflict, notFound, validationError } from "../../lib/errors.js";
import { DEFAULT_NEWS_CATEGORIES, NewsCategoryModel, type NewsCategoryDTO } from "./news-category.model.js";
import { News } from "./news.model.js";

const taken = () => conflict("A category with this name already exists.", { name: "Name already in use" });

/** Creates the default categories the first time they're needed. */
async function ensureDefaults(): Promise<void> {
  if (await NewsCategoryModel.exists({})) return;
  try {
    await NewsCategoryModel.insertMany(
      DEFAULT_NEWS_CATEGORIES.map((name, order) => ({ name, order })),
      { ordered: false },
    );
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

/** Category names in display order (news page tabs, editor dropdown). */
export async function listNewsCategoryNames(): Promise<string[]> {
  await ensureDefaults();
  return (await NewsCategoryModel.find({}, { name: 1 }).sort({ order: 1, _id: 1 }).lean()).map((c) => c.name);
}

/** The stored spelling of an existing category, or a field error. */
export async function assertNewsCategory(name: string): Promise<string> {
  const names = await listNewsCategoryNames();
  const match = names.find((n) => n.toLowerCase() === name.trim().toLowerCase());
  if (!match) throw validationError({ category: "Choose a category" });
  return match;
}

export async function listAdminNewsCategories(): Promise<NewsCategoryDTO[]> {
  await ensureDefaults();
  const [cats, counts] = await Promise.all([
    NewsCategoryModel.find().sort({ order: 1, _id: 1 }).lean(),
    News.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$category", n: { $sum: 1 } } }]),
  ]);
  const byName = new Map(counts.map((c) => [c._id, c.n]));
  return cats.map((c) => ({ id: String(c._id), name: c.name, order: c.order, articles: byName.get(c.name) ?? 0 }));
}

export async function createNewsCategory(name: string): Promise<NewsCategoryDTO> {
  await ensureDefaults();
  const last = await NewsCategoryModel.findOne().sort({ order: -1 }).lean();
  try {
    const doc = await NewsCategoryModel.create({ name, order: (last?.order ?? -1) + 1 });
    return { id: doc.id, name: doc.name, order: doc.order, articles: 0 };
  } catch (err) {
    if (isDuplicateKeyError(err)) throw taken();
    throw err;
  }
}

/** Renames a category and moves its articles to the new name. */
export async function renameNewsCategory(id: string, name: string): Promise<NewsCategoryDTO> {
  const doc = await NewsCategoryModel.findById(id);
  if (!doc) throw notFound("Category");
  const old = doc.name;
  doc.name = name;
  try {
    await doc.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) throw taken();
    throw err;
  }
  if (old !== name) await News.updateMany({ category: old }, { $set: { category: name } });
  return { id: doc.id, name: doc.name, order: doc.order, articles: await News.countDocuments({ category: name }) };
}

/** Deletes an unused category; one that still has articles must be emptied (or renamed) first. */
export async function deleteNewsCategory(id: string): Promise<void> {
  const doc = await NewsCategoryModel.findById(id);
  if (!doc) throw notFound("Category");
  const used = await News.countDocuments({ category: doc.name });
  if (used > 0) {
    const what = used === 1 ? "1 article" : `${used} articles`;
    throw conflict(`"${doc.name}" still has ${what}. Move them to another category first.`, undefined, "CATEGORY_IN_USE");
  }
  await doc.deleteOne();
}

/** Saves a new display order (ids in order). */
export async function reorderNewsCategories(ids: string[]): Promise<NewsCategoryDTO[]> {
  await Promise.all(ids.map((id, order) => NewsCategoryModel.updateOne({ _id: id }, { $set: { order } })));
  return listAdminNewsCategories();
}
