"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ButtonLink } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import type { Provider } from "@/lib/types";
import { reloadFavorites, setFavorite, useAccountFavorites } from "./favorites-store";
import { RequirePermission } from "./ui";

/** Uploaded/empty covers can't go through next/image in ProviderCard; fall back to a bundled photo. */
const FALLBACK_COVER = "/images/providers/aircraft-nose.jpg";

function forCard(p: Provider): Provider {
  return p.coverImage.startsWith("/") ? p : { ...p, coverImage: FALLBACK_COVER };
}

export function FavoritesList() {
  return (
    <RequirePermission permission="favorites:manage" title="Favourites">
      <Favorites />
    </RequirePermission>
  );
}

function Favorites() {
  const favs = useAccountFavorites();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = favs.items.filter((p) => favs.ids.has(p.id));
  // Providers saved elsewhere this session aren't in the cached list yet: refetch once.
  const stale = favs.status === "ready" && favs.ids.size > items.length;
  const refreshed = useRef(false);
  useEffect(() => {
    if (stale && !refreshed.current) {
      refreshed.current = true;
      reloadFavorites();
    }
  }, [stale]);

  async function remove(p: Provider) {
    setRemoving(p.id);
    setError(null);
    try {
      await setFavorite(p.id, false);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : `Couldn't remove ${p.name}. Please try again.`);
    } finally {
      setRemoving(null);
    }
  }

  const loading = favs.authLoading || (favs.active && (favs.status === "loading" || favs.status === "idle"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Favourites"
        description="Providers you've saved. Tap the heart on any provider card to add it here."
        actions={
          <ButtonLink href="/directory" variant="outline" size="sm">
            Browse the directory
          </ButtonLink>
        }
      />
      {error && <FormStatus status="error" message={error} />}
      {!favs.active && !loading ? (
        <div className="rounded-2xl border border-line bg-white shadow-soft">
          <EmptyState title="Favourites are saved in this browser" description="Account favourites sync when the site is connected to the platform API." />
        </div>
      ) : favs.status === "error" ? (
        <ErrorPanel error={new Error("We couldn't load your saved providers.")} onRetry={reloadFavorites} />
      ) : loading ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[380px] animate-pulse rounded-[20px] bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white shadow-soft">
          <EmptyState
            title="No favourites yet"
            description="Save FBOs, handlers, fuel suppliers and operators you work with to find them again quickly."
            action={
              <ButtonLink href="/directory" size="sm" className="mt-3">
                Find providers
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((p) => (
            <li key={p.id} className="flex flex-col gap-2">
              <ProviderCard provider={forCard(p)} />
              <button
                type="button"
                onClick={() => remove(p)}
                disabled={removing === p.id}
                className="inline-flex items-center justify-center gap-1.5 self-end rounded-xl px-3 py-1.5 text-sm font-semibold text-muted hover:bg-danger/5 hover:text-danger disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
                {removing === p.id ? "Removing…" : "Remove"}
                <span className="sr-only"> {p.name} from favourites</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
