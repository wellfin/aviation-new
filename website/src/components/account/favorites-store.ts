"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { publicConfig } from "@/lib/public-config";
import type { Provider } from "@/lib/types";

/**
 * Account favourites, shared by every FavoriteButton and the /account pages.
 * Signed in (API mode): the server list is fetched once per session and
 * toggles are optimistic. Signed out: favourites live in localStorage and are
 * merged into the account on the next sign-in.
 */

export const LOCAL_FAVORITES_KEY = "ga_favorites";
export const LOCAL_FAVORITES_EVENT = "ga:favorites";
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export interface FavoritesState {
  /** Account the list belongs to; null when signed out / not applicable. */
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  ids: ReadonlySet<string>;
  /** Server list from the last fetch (published providers only, newest first). */
  items: Provider[];
}

const EMPTY: FavoritesState = { userId: null, status: "idle", ids: new Set(), items: [] };
let state: FavoritesState = EMPTY;
const listeners = new Set<() => void>();

function setState(next: FavoritesState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

/* ---------------------------------------------------------------- local (signed out) */

export function readLocalFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocalFavorites(ids: string[]): void {
  try {
    if (ids.length) window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(ids));
    else window.localStorage.removeItem(LOCAL_FAVORITES_KEY);
  } catch {
    /* storage unavailable (private mode) — favourite won't persist */
  }
  window.dispatchEvent(new Event(LOCAL_FAVORITES_EVENT));
}

/* ---------------------------------------------------------------- account sync */

/** Pushes favourites saved while signed out into the account, then clears them locally. */
async function mergeLocalFavorites(): Promise<void> {
  const local = readLocalFavorites().filter((id) => OBJECT_ID.test(id));
  if (local.length === 0) {
    if (readLocalFavorites().length) writeLocalFavorites([]);
    return;
  }
  const results = await Promise.allSettled(local.map((id) => apiRequest("PUT", `/me/favorites/${id}`)));
  // Keep only the ones that failed for a transient reason (not "provider not found / not published").
  const retry = local.filter((_, i) => {
    const r = results[i];
    return r?.status === "rejected" && !(r.reason instanceof ApiError && r.reason.status >= 400 && r.reason.status < 500);
  });
  writeLocalFavorites(retry);
}

async function load(userId: string): Promise<void> {
  setState({ userId, status: "loading", ids: new Set(), items: [] });
  try {
    await mergeLocalFavorites();
    const items = await apiRequest<Provider[]>("GET", "/me/favorites");
    if (state.userId !== userId) return;
    setState({ userId, status: "ready", ids: new Set(items.map((p) => p.id)), items });
  } catch {
    if (state.userId !== userId) return;
    setState({ userId, status: "error", ids: new Set(), items: [] });
  }
}

/** Points the store at the signed-in account (fetches once per account per page session). */
export function syncFavoritesAccount(userId: string | null): void {
  if (userId === state.userId && (state.status !== "error" || userId === null)) return;
  if (userId === null) {
    setState(EMPTY);
    return;
  }
  void load(userId);
}

/** Re-fetches the server list (e.g. the favourites page after an error). */
export function reloadFavorites(): void {
  if (state.userId) void load(state.userId);
}

/** Optimistic add/remove for the signed-in account; reverts and rethrows on failure. */
export async function setFavorite(providerId: string, saved: boolean): Promise<void> {
  const userId = state.userId;
  if (!userId) throw new ApiError(401, { code: "UNAUTHORIZED", message: "Please sign in to save favourites." });
  const before = state;
  const ids = new Set(state.ids);
  if (saved) ids.add(providerId);
  else ids.delete(providerId);
  setState({ ...state, ids, items: saved ? state.items : state.items.filter((p) => p.id !== providerId) });
  try {
    await apiRequest(saved ? "PUT" : "DELETE", `/me/favorites/${providerId}`);
  } catch (err) {
    if (state.userId === userId) setState(before);
    throw err;
  }
}

/* ---------------------------------------------------------------- hook */

/**
 * Subscribes to the account favourites. `active` is true when favourites are
 * account-backed (API mode + signed in with `favorites:manage`).
 */
export function useAccountFavorites(): FavoritesState & { active: boolean; authLoading: boolean } {
  const { user, loading } = useAuth();
  const eligible = publicConfig.dataSource === "api" && !!user && can(user, "favorites:manage");
  const accountId = eligible && user ? user.id : null;

  useEffect(() => {
    if (!loading) syncFavoritesAccount(accountId);
  }, [loading, accountId]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snapshot, active: accountId !== null, authLoading: loading };
}
