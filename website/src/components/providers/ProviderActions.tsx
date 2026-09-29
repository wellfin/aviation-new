"use client";

import { Check, Heart, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { LOCAL_FAVORITES_EVENT, LOCAL_FAVORITES_KEY, readLocalFavorites, setFavorite, useAccountFavorites, writeLocalFavorites } from "@/components/account/favorites-store";
import { cn } from "@/lib/utils";

function readRaw(): string {
  try {
    return window.localStorage.getItem(LOCAL_FAVORITES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_FAVORITES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_FAVORITES_EVENT, onChange);
  };
}

const TONE = {
  dark: "size-8 rounded-lg bg-navy-950/70 text-white backdrop-blur-sm hover:bg-navy-950/85",
  light: "size-10 rounded-[12px] border border-brand/20 bg-brand/8 text-brand hover:bg-brand/12",
} as const;

/**
 * Favourite toggle. Signed-in accounts (API mode) save to the server
 * optimistically; signed-out visitors save in this browser, and those
 * favourites are merged into the account on the next sign-in.
 */
export function FavoriteButton({ providerId, tone = "dark" }: { providerId: string; tone?: keyof typeof TONE }) {
  const account = useAccountFavorites();
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const [failed, setFailed] = useState(false);
  const saved = account.active ? account.ids.has(providerId) : raw.includes(`"${providerId}"`);
  const syncing = account.active && account.status === "loading";

  function toggle() {
    if (account.active) {
      setFailed(false);
      setFavorite(providerId, !saved).catch(() => {
        setFailed(true);
        setTimeout(() => setFailed(false), 3000);
      });
      return;
    }
    const favs = new Set(readLocalFavorites());
    if (favs.has(providerId)) favs.delete(providerId);
    else favs.add(providerId);
    writeLocalFavorites([...favs]);
  }

  const label = failed ? "Couldn't update favourites — try again" : saved ? "Remove from favourites" : "Save to favourites";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={syncing}
      aria-pressed={saved}
      aria-label={label}
      title={failed ? label : undefined}
      className={cn("flex items-center justify-center transition disabled:opacity-60", TONE[tone], failed && "ring-2 ring-danger")}
    >
      <Heart className={cn("size-4", saved && "fill-danger text-danger")} />
    </button>
  );
}

/** Uses the Web Share API when available, otherwise copies the link. */
export function ShareButton({ title, path, tone = "light", label }: { title: string; path: string; tone?: keyof typeof TONE; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled share sheet */
    }
  }

  if (label) {
    return (
      <button type="button" onClick={share} className="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-brand-cyan backdrop-blur-sm hover:bg-white/10">
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {copied ? "Link copied" : label}
      </button>
    );
  }

  return (
    <button type="button" onClick={share} aria-label={copied ? "Link copied" : `Share ${title}`} className={cn("flex items-center justify-center transition", TONE[tone])}>
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
    </button>
  );
}
