"use client";

import { CheckCircle2, Circle, ExternalLink, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorPanel, PageHeader, StatusPill } from "@/components/admin/ui";
import { TierBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ApiError, apiRequest } from "@/lib/api/client";
import { cn, formatDate } from "@/lib/utils";
import { useAccount } from "../AccountShell";
import { useAccountApi } from "../hooks";
import { TIER_LABEL, type Listing } from "../types";
import { Notice, RequirePermission } from "../ui";
import { AirportsSection } from "./AirportsSection";
import { CreateListingForm } from "./CreateListingForm";
import { FleetSection } from "./FleetSection";
import { BrochuresSection, CertificationsSection, ServicesSection } from "./ListSections";
import { MediaSection } from "./MediaSection";
import { FLEET_LISTING_CATEGORIES } from "./schema";
import { AboutSection, BasicsSection, ContactSection, SocialsSection } from "./TextSections";

export function ListingManager() {
  return (
    <RequirePermission permission="listing:manage:own" title="Listing management">
      <Manager />
    </RequirePermission>
  );
}

/** Mirrors the backend's minimum content check for review (listing.service missingForReview). */
const CHECKS: Array<{ key: string; section: string; label: string; done: (l: Listing) => boolean }> = [
  { key: "about", section: "about", label: "Describe your business", done: (l) => l.about.some((p) => p.trim()) },
  { key: "contact", section: "contact", label: "Add a contact email or phone", done: (l) => Boolean(l.contact.email || l.contact.phone) },
  { key: "airports", section: "airports", label: "Add at least one airport", done: (l) => l.airports.length > 0 },
  { key: "services", section: "services", label: "Add at least one service", done: (l) => l.services.length > 0 },
];

function Manager() {
  const { user } = useAccount();
  const { data, error, loading, reload } = useAccountApi<Listing>("/me/listing");
  const [local, setLocal] = useState<Listing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; fields: Record<string, string> } | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Local copy wins once the owner has created/saved; the fetched one otherwise.
  const listing = local ?? data;

  async function submitForReview() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setLocal(await apiRequest<Listing>("POST", "/me/listing/submit"));
      setJustSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? { message: err.status === 422 ? "Complete these before submitting:" : err.body.message, fields: err.body.fieldErrors ?? {} }
          : { message: "Couldn't submit your listing. Please try again.", fields: {} },
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!listing) {
    if (loading) {
      return (
        <div className="space-y-4" aria-busy="true">
          <PageHeader title="My listing" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface" />
        </div>
      );
    }
    if (error?.status === 404) {
      return (
        <div>
          <PageHeader title="My listing" description="Your company's profile in the Global Aviation Services Directory." />
          <CreateListingForm onCreated={setLocal} />
        </div>
      );
    }
    if (error?.body.code === "EMAIL_NOT_VERIFIED") {
      return (
        <div>
          <PageHeader title="My listing" />
          <Notice
            tone="warning"
            title="Verify your email to manage your listing"
            action={
              <ButtonLink href={`/verify-email?email=${encodeURIComponent(user.email)}`} size="sm">
                Verify email
              </ButtonLink>
            }
          >
            We sent a 6-digit code to {user.email}. Once verified, you can create and edit your company listing.
          </Notice>
        </div>
      );
    }
    return (
      <div>
        <PageHeader title="My listing" />
        {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      </div>
    );
  }

  const l = listing;
  const canSubmit = l.status === "draft" || l.status === "rejected";
  const missing = CHECKS.filter((c) => !c.done(l));
  const hasFleet = FLEET_LISTING_CATEGORIES.includes(l.category) || l.fleet.length > 0;
  const sections = [
    ["basics", "Basics"],
    ["about", "About"],
    ["contact", "Contact"],
    ["socials", "Social"],
    ["media", "Photos & video"],
    ["services", "Services"],
    ["airports", "Airports"],
    ["certifications", "Certifications"],
    ["brochures", "Brochures"],
    ...(hasFleet ? [["fleet", "Fleet"]] : []),
  ] as const;

  const submitButton = canSubmit && (
    <Button size="sm" onClick={submitForReview} loading={submitting}>
      <Send className="size-4" aria-hidden />
      {l.status === "rejected" ? "Resubmit for review" : "Submit for review"}
    </Button>
  );
  const viewButton = l.status === "published" && (
    <ButtonLink href={`/providers/${l.slug}`} size="sm" variant="outline" target="_blank">
      <ExternalLink className="size-4" aria-hidden /> View public profile
    </ButtonLink>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My listing"
        description={`${l.name} · last updated ${formatDate(l.updatedAt)}`}
        actions={
          <>
            {viewButton}
            {submitButton}
          </>
        }
      />

      {l.status === "draft" && (
        <Notice tone="info" title="Draft — only you can see this listing">
          Fill in your profile, then submit it for review. Our team usually reviews new listings within one business day.
        </Notice>
      )}
      {l.status === "pending" && (
        <Notice tone="warning" title={justSubmitted ? "Submitted — thanks!" : "Under review"}>
          Our team is reviewing your listing and will email you when it&apos;s published. You can keep editing in the meantime.
        </Notice>
      )}
      {l.status === "published" && (
        <Notice tone="success" title="Published" action={viewButton || undefined}>
          Your listing is live{l.publishedAt ? ` since ${formatDate(l.publishedAt)}` : ""}. Changes you save here appear on your public profile straight away.
        </Notice>
      )}
      {l.status === "rejected" && (
        <Notice tone="danger" title="Changes requested">
          {l.rejectionReason ? (
            <>
              <span className="font-semibold text-ink">Reviewer&apos;s note:</span> {l.rejectionReason}
            </>
          ) : (
            "Your listing wasn't approved."
          )}{" "}
          Update your listing and resubmit it.
        </Notice>
      )}
      {l.status === "suspended" && (
        <Notice
          tone="danger"
          title="Listing suspended"
          action={
            <ButtonLink href="/contact" size="sm" variant="outline">
              Contact support
            </ButtonLink>
          }
        >
          Your listing is hidden from the directory. Please contact our team to resolve this.
        </Notice>
      )}

      {submitError && (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="font-bold text-danger">{submitError.message}</p>
          {Object.keys(submitError.fields).length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(submitError.fields).map(([field, msg]) => (
                <li key={field}>
                  <a href={`#${field}`} className="text-ink underline decoration-danger/40 underline-offset-2 hover:text-danger">
                    {msg}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">Status</p>
            <StatusPill status={l.status} />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">Ready for review</p>
          <ul className="mt-2 space-y-1.5">
            {CHECKS.map((c) => {
              const ok = c.done(l);
              return (
                <li key={c.key}>
                  <a href={`#${c.section}`} className={cn("flex items-center gap-2 text-sm", ok ? "text-muted" : "text-ink hover:text-brand")}>
                    {ok ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <Circle className="size-4 text-subtle" aria-hidden />}
                    <span className={ok ? "line-through decoration-subtle" : undefined}>{c.label}</span>
                    <span className="sr-only">{ok ? "(done)" : "(to do)"}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          {canSubmit && missing.length === 0 && <p className="mt-3 text-xs text-[#15803d]">All set — you can submit your listing for review.</p>}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">Plan</p>
            <TierBadge tier={l.tier} className="bg-navy-900" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">{TIER_LABEL[l.tier]} includes</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>Up to {l.limits.galleryImages} gallery images</li>
            <li>{l.limits.socials ? "Social media links" : "No social media links (Pro and above)"}</li>
            <li>{l.limits.video ? "Profile video" : "No profile video (Ultra Pro)"}</li>
            <li>{l.tier === "basic" ? "No enquiry form (Pro and above)" : "Enquiries from your profile"}</li>
          </ul>
          {l.tier !== "ultra_pro" && (
            <Link href="/account/billing" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
              Compare plans & upgrade →
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="Listing sections" className="sticky top-[76px] z-10 -mx-1 overflow-x-auto rounded-2xl border border-line bg-white/95 p-1.5 shadow-soft backdrop-blur scrollbar-none">
        <ul className="flex gap-1">
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="flex h-9 items-center rounded-xl px-3 text-sm font-semibold whitespace-nowrap text-muted hover:bg-surface hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div key={l.id} className="space-y-6">
        <BasicsSection listing={l} onSaved={setLocal} />
        <AboutSection listing={l} onSaved={setLocal} />
        <ContactSection listing={l} onSaved={setLocal} />
        <SocialsSection listing={l} onSaved={setLocal} />
        <MediaSection listing={l} onSaved={setLocal} />
        <ServicesSection listing={l} onSaved={setLocal} />
        <AirportsSection listing={l} onSaved={setLocal} />
        <CertificationsSection listing={l} onSaved={setLocal} />
        <BrochuresSection listing={l} onSaved={setLocal} />
        {hasFleet && <FleetSection listing={l} onSaved={setLocal} />}
      </div>

      {canSubmit && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            {missing.length ? `Still to do: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.` : "Everything's in place. Save any open sections, then submit your listing."}
          </p>
          {submitButton}
        </div>
      )}
    </div>
  );
}
