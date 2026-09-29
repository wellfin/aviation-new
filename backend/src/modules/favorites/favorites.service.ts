import { conflict, notFound } from "../../lib/errors.js";
import { AIRPORT_REF_FIELDS, Provider, type ProviderDTO, toProviderDTO } from "../providers/provider.model.js";
import { User, type UserDoc } from "../users/user.model.js";

export const MAX_FAVORITES = 500;

/** The user's saved providers, most recently saved first; unpublished listings are hidden. */
export async function listFavorites(user: UserDoc): Promise<ProviderDTO[]> {
  const ids = user.favorites ?? [];
  if (ids.length === 0) return [];
  const docs = await Provider.find({ _id: { $in: ids }, status: "published" }).populate("airports", AIRPORT_REF_FIELDS);
  const byId = new Map(docs.map((d) => [d.id as string, d]));
  return [...ids]
    .reverse()
    .map((id) => byId.get(String(id)))
    .filter((d) => d !== undefined)
    .map((d) => toProviderDTO(d));
}

/** Idempotent add; the size guard lives in the update filter so it holds under concurrency. */
export async function addFavorite(user: UserDoc, providerId: string): Promise<void> {
  const provider = await Provider.exists({ _id: providerId, status: "published" });
  if (!provider) throw notFound("Provider");
  const result = await User.updateOne(
    { _id: user._id, [`favorites.${MAX_FAVORITES - 1}`]: { $exists: false } },
    { $addToSet: { favorites: provider._id } },
  );
  if (result.matchedCount === 0) {
    const already = await User.exists({ _id: user._id, favorites: provider._id });
    if (!already) throw conflict(`You can save up to ${MAX_FAVORITES} providers. Remove some to add more.`, undefined, "FAVORITES_LIMIT");
  }
}

export async function removeFavorite(user: UserDoc, providerId: string): Promise<void> {
  await User.updateOne({ _id: user._id }, { $pull: { favorites: providerId } });
}
