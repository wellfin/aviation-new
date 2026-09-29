"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/admin/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ReasonDialog } from "./form-kit";
import { canTransition, type AdminProvider, type ProviderAction } from "./schema";

const DESCRIPTIONS: Record<ProviderAction | "delete", string> = {
  approve: "Publish the listing in the directory.",
  reject: "Send it back to the owner with a reason (pending only).",
  suspend: "Hide a published listing temporarily.",
  unpublish: "Move it back to draft.",
  delete: "Remove the listing with its reviews and enquiries.",
};

/**
 * Moderation buttons for one listing. Buttons are enabled only for the transitions
 * the backend allows from the current status (it re-checks and returns INVALID_STATUS).
 */
export function StatusActions({
  provider,
  onChanged,
  onDeleted,
  onError,
  actions = ["approve", "reject", "suspend", "unpublish", "delete"],
  compact,
}: {
  provider: Pick<AdminProvider, "id" | "name" | "status">;
  onChanged: (updated: AdminProvider, message: string) => void;
  onDeleted?: () => void;
  onError: (message: string) => void;
  actions?: Array<ProviderAction | "delete">;
  compact?: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const status = provider.status;

  async function run(action: Exclude<ProviderAction, "reject">, message: string) {
    setBusy(action);
    try {
      onChanged(await apiRequest<AdminProvider>("POST", `/admin/providers/${provider.id}/${action}`), message);
    } catch (err) {
      onError(err instanceof ApiError ? err.body.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const btn = (tone: "green" | "neutral") =>
    cn(
      "h-9 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
      tone === "green" ? "bg-success text-white hover:brightness-105" : "border border-line bg-white text-ink hover:bg-surface",
    );

  const has = (a: ProviderAction | "delete") => actions.includes(a);
  const why = (a: ProviderAction) => (canTransition(a, status) ? DESCRIPTIONS[a] : `Not available for a ${status} listing.`);

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
      {has("approve") && (
        <button type="button" title={why("approve")} disabled={!canTransition("approve", status) || busy !== null} onClick={() => run("approve", `“${provider.name}” is now published.`)} className={btn("green")}>
          {busy === "approve" ? "Approving…" : status === "suspended" ? "Reinstate" : "Approve & publish"}
        </button>
      )}
      {has("reject") && (
        <button type="button" title={why("reject")} disabled={!canTransition("reject", status) || busy !== null} onClick={() => setRejecting(true)} className={cn(btn("neutral"), "text-danger")}>
          Reject…
        </button>
      )}
      {has("suspend") && (
        <button type="button" title={why("suspend")} disabled={!canTransition("suspend", status) || busy !== null} onClick={() => run("suspend", "Listing suspended and hidden from the directory.")} className={btn("neutral")}>
          {busy === "suspend" ? "Suspending…" : "Suspend"}
        </button>
      )}
      {has("unpublish") && (
        <button type="button" title={why("unpublish")} disabled={!canTransition("unpublish", status) || busy !== null} onClick={() => run("unpublish", "Listing moved back to draft.")} className={btn("neutral")}>
          {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
        </button>
      )}
      {has("delete") && onDeleted && (
        <ConfirmButton
          confirmLabel="Delete listing"
          disabled={busy !== null}
          onConfirm={async () => {
            try {
              await apiRequest("DELETE", `/admin/providers/${provider.id}`);
              onDeleted();
            } catch (err) {
              onError(err instanceof ApiError ? err.body.message : "Couldn't delete this listing.");
            }
          }}
        >
          Delete
        </ConfirmButton>
      )}
      <ReasonDialog
        open={rejecting}
        title={`Reject “${provider.name}”?`}
        description="The owner is emailed this reason and can edit and resubmit the listing."
        label="Reason for the provider"
        required
        minLength={5}
        maxLength={500}
        confirmLabel="Reject listing"
        onClose={() => setRejecting(false)}
        onConfirm={async (reason) => {
          onChanged(await apiRequest<AdminProvider>("POST", `/admin/providers/${provider.id}/reject`, { reason }), "Listing rejected. The owner has been notified.");
        }}
      />
    </div>
  );
}
