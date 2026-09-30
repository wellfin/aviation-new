"use client";

import { BadgeCheck, Building2, CloudSun, CreditCard, Heart, Inbox, MailWarning, MessageSquareText, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { can, useAuth, type SessionUser } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/utils";
import { isBusiness, useAccount } from "./AccountShell";
import { LOCAL_FAVORITES_EVENT, readLocalFavorites, useAccountFavorites } from "./favorites-store";
import { useAccountApi } from "./hooks";
import type { Listing, OwnReview, Paginated, SubscriptionOverview } from "./types";
import { TIER_LABEL } from "./types";
import { Notice, StatTile } from "./ui";

const ROLE_LABEL: Record<SessionUser["role"], { label: string; tone: "blue" | "green" | "purple" }> = {
  USER: { label: "Member", tone: "blue" },
  PROVIDER: { label: "Service Provider", tone: "green" },
  MANAGER: { label: "Manager", tone: "purple" },
  ADMIN: { label: "Administrator", tone: "purple" },
};

function subscribeLocal(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(LOCAL_FAVORITES_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(LOCAL_FAVORITES_EVENT, cb);
  };
}

export function AccountOverview() {
  const { user, profile, displayName } = useAccount();
  const { resendVerification } = useAuth();
  const favorites = useAccountFavorites();
  const localCount = useSyncExternalStore(subscribeLocal, () => readLocalFavorites().length, () => 0);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const isProvider = isBusiness(user);
  const reviews = useAccountApi<Paginated<OwnReview>>(can(user, "reviews:create") ? "/me/reviews?pageSize=1" : null);
  const listing = useAccountApi<Listing>(isProvider ? "/me/listing" : null);
  const enquiries = useAccountApi<Paginated<unknown>>(isProvider && can(user, "enquiries:read:own") ? "/me/enquiries?status=new&pageSize=1" : null);
  const billing = useAccountApi<SubscriptionOverview>(isProvider && can(user, "billing:manage:own") ? "/billing/subscription" : null);

  const verified = profile?.emailVerified ?? user.emailVerified ?? true;
  const role = ROLE_LABEL[user.role];
  const initials = `${displayName.firstName[0] ?? ""}${displayName.lastName[0] ?? ""}`.toUpperCase();
  const favCount = favorites.active ? (favorites.status === "ready" ? favorites.ids.size : "…") : localCount;
  const noListing = listing.error instanceof ApiError && listing.error.status === 404;
  const listingBlocked = listing.error instanceof ApiError && listing.error.status === 403;

  async function handleResend() {
    setResend("sending");
    try {
      await resendVerification(user.email);
      setResend("sent");
    } catch {
      setResend("error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Account overview" description="Your profile, saved providers and activity at a glance." />

      {!verified && (
        <Notice
          tone="warning"
          title="Verify your email address"
          action={
            <>
              <ButtonLink href={`/verify-email?email=${encodeURIComponent(user.email)}`} size="sm">
                Enter code
              </ButtonLink>
              <Button variant="outline" size="sm" onClick={handleResend} loading={resend === "sending"} disabled={resend === "sent"}>
                {resend === "sent" ? "Code sent" : "Resend code"}
              </Button>
            </>
          }
        >
          {resend === "error"
            ? "We couldn't send a new code right now. Please try again in a minute."
            : `Some features — writing reviews${isProvider ? " and managing your listing" : ""} — need a verified email. We sent a code to ${user.email}.`}
        </Notice>
      )}

      <section aria-labelledby="profile-heading" className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden className="bg-brand-gradient flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="profile-heading" className="truncate text-lg font-bold text-ink">
              {displayName.firstName} {displayName.lastName}
            </h2>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {verified ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#15803d]">
                  <BadgeCheck className="size-3.5" aria-hidden /> Email verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-[#a16207]">
                  <MailWarning className="size-3.5" aria-hidden /> Email not verified
                </span>
              )}
              {profile?.company && <span className="text-muted">· {profile.company}</span>}
              {profile?.createdAt && <span className="text-subtle">· Member since {formatDate(profile.createdAt)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={role.tone} className="px-3 py-1 text-xs">
              {role.label}
            </Badge>
            <ButtonLink href="/account/profile" variant="outline" size="sm">
              Edit profile
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-label="Activity" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {can(user, "favorites:manage") && <StatTile label="Saved favourites" value={favCount} icon={<Heart className="size-5" aria-hidden />} tone="danger" href="/account/favorites" />}
        {can(user, "reviews:create") && (
          <StatTile
            label="Reviews written"
            value={reviews.data ? reviews.data.total : reviews.error ? "—" : "…"}
            icon={<MessageSquareText className="size-5" aria-hidden />}
            href="/account/reviews"
          />
        )}
        {isProvider && (
          <StatTile
            label="Listing status"
            value={
              listing.data ? (
                <StatusPill status={listing.data.status} />
              ) : noListing ? (
                "Not created"
              ) : listingBlocked ? (
                "Verify email first"
              ) : listing.error ? (
                "—"
              ) : (
                "…"
              )
            }
            icon={<Building2 className="size-5" aria-hidden />}
            tone="success"
            href="/account/listing"
          />
        )}
        {isProvider && can(user, "enquiries:read:own") && (
          <StatTile
            label="New enquiries"
            value={enquiries.data ? enquiries.data.total : enquiries.error ? "—" : "…"}
            icon={<Inbox className="size-5" aria-hidden />}
            tone="warning"
            href="/account/enquiries?status=new"
          />
        )}
        {isProvider && can(user, "billing:manage:own") && (
          <StatTile
            label="Current plan"
            value={
              listing.data
                ? TIER_LABEL[listing.data.tier]
                : billing.data?.listing
                  ? TIER_LABEL[billing.data.listing.tier]
                  : noListing
                    ? "Basic (free)"
                    : "…"
            }
            icon={<CreditCard className="size-5" aria-hidden />}
            href="/account/billing"
          />
        )}
      </section>

      {isProvider && noListing && (
        <Notice
          tone="info"
          title="Get your business in front of operators worldwide"
          action={
            <ButtonLink href="/account/listing" size="sm">
              Create your listing
            </ButtonLink>
          }
        >
          Your business account is ready. Create your company listing to appear in the directory and start receiving enquiries.
        </Notice>
      )}

      <section aria-labelledby="links-heading">
        <h2 id="links-heading" className="mb-3 text-base font-bold text-ink">
          Quick links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { href: "/directory", title: "Browse the Directory", text: "FBOs, handlers, fuel, MRO & charter worldwide", icon: Search },
            { href: "/tools", title: "Aviation Tools", text: "METAR, TAF, NOTAMs, runways & nearby airports", icon: CloudSun },
            { href: "/account/profile", title: "Profile details", text: "Name, phone number and company", icon: UserRound },
            ...(isProvider ? [{ href: "/pricing", title: "Compare plans", text: "See what Pro and Ultra Pro unlock", icon: CreditCard }] : []),
          ].map(({ href, title, text, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:border-brand/40 hover:shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/8 text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="mt-3 block font-bold text-ink group-hover:text-brand">{title} →</span>
              <span className="mt-1 block text-sm text-muted">{text}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
