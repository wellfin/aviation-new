import { withTransaction } from "../../lib/db.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { Faq, FAQ_CATEGORIES, type FaqCategory, toAdminFaqDTO, toFaqDTO, type AdminFaqDTO, type FaqItemDTO } from "./faq.model.js";
import type { AdminFaqQuery, CreateFaqInput, UpdateFaqInput } from "./faqs.schemas.js";

const isFaqCategory = (c: string): c is FaqCategory => (FAQ_CATEGORIES as readonly string[]).includes(c);

export async function listPublishedFaqs(category?: string): Promise<FaqItemDTO[]> {
  if (category && !isFaqCategory(category)) return [];
  const filter: Record<string, unknown> = { published: true };
  if (category) filter.category = category;
  const items = await Faq.find(filter).sort({ order: 1, _id: 1 }).limit(500);
  return items.map(toFaqDTO);
}

export async function listAdminFaqs(query: AdminFaqQuery): Promise<AdminFaqDTO[]> {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.published !== undefined) filter.published = query.published;
  const items = await Faq.find(filter).sort({ order: 1, _id: 1 }).limit(1000);
  return items.map(toAdminFaqDTO);
}

export async function getAdminFaq(id: string): Promise<AdminFaqDTO> {
  const doc = await Faq.findById(id);
  if (!doc) throw notFound("FAQ");
  return toAdminFaqDTO(doc);
}

/** New FAQs go to the end unless an explicit position is given. */
export async function createFaq(input: CreateFaqInput): Promise<AdminFaqDTO> {
  let order = input.order;
  if (order === undefined) {
    const last = await Faq.findOne({}, { order: 1 }).sort({ order: -1 }).lean();
    order = (last?.order ?? -1) + 1;
  }
  const doc = await Faq.create({ question: input.question, answer: input.answer, category: input.category, published: input.published, order });
  return toAdminFaqDTO(doc);
}

export async function updateFaq(id: string, input: UpdateFaqInput): Promise<AdminFaqDTO> {
  const doc = await Faq.findById(id);
  if (!doc) throw notFound("FAQ");
  if (input.question !== undefined) doc.question = input.question;
  if (input.answer !== undefined) doc.answer = input.answer;
  if (input.category !== undefined) doc.category = input.category;
  if (input.published !== undefined) doc.published = input.published;
  if (input.order !== undefined) doc.order = input.order;
  await doc.save();
  return toAdminFaqDTO(doc);
}

export async function deleteFaq(id: string): Promise<void> {
  const res = await Faq.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw notFound("FAQ");
}

/**
 * Sets `order` to each id's index. All-or-nothing: if any id is unknown the
 * whole reorder is rolled back so the list is never left half-sorted.
 */
export async function reorderFaqs(ids: string[]): Promise<AdminFaqDTO[]> {
  await withTransaction(async (session) => {
    const res = await Faq.bulkWrite(
      ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } })),
      { session, ordered: true },
    );
    if (res.matchedCount !== ids.length) throw badRequest("Some FAQs no longer exist. Refresh and try again.", { ids: "Unknown FAQ id" });
  });
  return listAdminFaqs({});
}
