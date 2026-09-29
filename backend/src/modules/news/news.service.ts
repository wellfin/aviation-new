import { isDuplicateKeyError } from "../../lib/db.js";
import { conflict, notFound } from "../../lib/errors.js";
import { containsRegex, escapeRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { News, type NewsDoc, toAdminNewsDTO, toNewsDTO, type AdminNewsDTO, type NewsArticleDTO } from "./news.model.js";
import type { AdminNewsQuery, CreateNewsInput, PublicNewsQuery, UpdateNewsInput } from "./news.schemas.js";

/** URL slug from free text: ASCII-folded, lowercase, hyphen separated. */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug || "article";
}

/** First free slug of the form `base`, `base-2`, `base-3`, … */
async function uniqueSlug(base: string): Promise<string> {
  const taken = new Set(
    (await News.find({ slug: new RegExp(`^${escapeRegex(base)}(?:-\\d+)?$`) }, { slug: 1 }).lean()).map((n) => n.slug),
  );
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

const slugTaken = () => conflict("An article with this slug already exists.", { slug: "Slug already in use" });

export async function listPublishedNews(query: PublicNewsQuery): Promise<Paginated<NewsArticleDTO>> {
  const filter: Record<string, unknown> = { status: "published", publishedAt: { $lte: new Date() } };
  if (query.category !== "all") filter.category = query.category;
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ title: rx }, { excerpt: rx }];
  }
  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1, _id: -1 }).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
    News.countDocuments(filter),
  ]);
  return paginated(items.map(toNewsDTO), total, query.page, query.pageSize);
}

export async function getPublishedNews(slug: string): Promise<NewsArticleDTO> {
  const doc = await News.findOne({ slug, status: "published", publishedAt: { $lte: new Date() } });
  if (!doc) throw notFound("Article");
  return toNewsDTO(doc);
}

export async function listAdminNews(query: AdminNewsQuery): Promise<Paginated<AdminNewsDTO>> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ title: rx }, { excerpt: rx }, { slug: rx }, { author: rx }];
  }
  const [items, total] = await Promise.all([
    News.find(filter).sort({ updatedAt: -1 }).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
    News.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminNewsDTO), total, query.page, query.pageSize);
}

async function findById(id: string): Promise<NewsDoc> {
  const doc = await News.findById(id);
  if (!doc) throw notFound("Article");
  return doc;
}

export async function getAdminNews(id: string): Promise<AdminNewsDTO> {
  return toAdminNewsDTO(await findById(id));
}

export async function createNews(input: CreateNewsInput): Promise<AdminNewsDTO> {
  const explicitSlug = input.slug;
  const slug = explicitSlug ?? (await uniqueSlug(slugify(input.title)));
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : input.status === "published" ? new Date() : undefined;
  try {
    const doc = await News.create({
      slug,
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      image: input.image,
      body: input.body,
      author: input.author,
      authorRole: input.authorRole,
      featured: input.featured,
      status: input.status,
      publishedAt,
    });
    return toAdminNewsDTO(doc);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw slugTaken();
    throw err;
  }
}

export async function updateNews(id: string, input: UpdateNewsInput): Promise<AdminNewsDTO> {
  const doc = await findById(id);
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.title !== undefined) doc.title = input.title;
  if (input.excerpt !== undefined) doc.excerpt = input.excerpt;
  if (input.category !== undefined) doc.category = input.category;
  if (input.image !== undefined) doc.image = input.image;
  if (input.body !== undefined) doc.body = input.body;
  if (input.author !== undefined) doc.author = input.author;
  if (input.authorRole !== undefined) doc.authorRole = input.authorRole;
  if (input.featured !== undefined) doc.featured = input.featured;
  if (input.publishedAt !== undefined) doc.publishedAt = input.publishedAt ? new Date(input.publishedAt) : undefined;
  try {
    await doc.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) throw slugTaken();
    throw err;
  }
  return toAdminNewsDTO(doc);
}

/** Publishing keeps an existing publishedAt (so re-publishing doesn't bump an article to the top). */
export async function setNewsStatus(id: string, status: "draft" | "published"): Promise<AdminNewsDTO> {
  const doc = await findById(id);
  doc.status = status;
  if (status === "published" && !doc.publishedAt) doc.publishedAt = new Date();
  await doc.save();
  return toAdminNewsDTO(doc);
}

export async function deleteNews(id: string): Promise<void> {
  const res = await News.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw notFound("Article");
}
