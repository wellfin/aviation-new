import { LinkSelect } from "./LinkSelect";
import { TIER_OPTIONS, directoryHref, type DirectoryParams } from "./params";

/** "All Tiers" listing-tier filter. */
export function TierSelect({ params, className }: { params: DirectoryParams; className?: string }) {
  return (
    <LinkSelect
      label="Filter by listing tier"
      value={params.tier}
      className={className}
      options={TIER_OPTIONS.map((o) => ({ ...o, href: directoryHref(params, { tier: o.value }) }))}
    />
  );
}
