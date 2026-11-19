"use client";

import { ConfirmAction, ConfirmButton } from "@/components/admin/ui";
import { ApiError, apiRequest } from "@/lib/api/client";

/** Deletes an airport; the API refuses (409 AIRPORT_IN_USE) while listings still reference it. */
export function DeleteAirportButton({ icao, onDeleted, onError, icon }: { icao: string; onDeleted: () => void; onError: (message: string, inUse: boolean) => void; icon?: boolean }) {
  const run = async () => {
    try {
      await apiRequest("DELETE", `/admin/airports/${icao}`);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "AIRPORT_IN_USE") onError(`Can't delete ${icao}: ${err.body.message}`, true);
      else onError(err instanceof ApiError ? err.body.message : "Couldn't delete this airport.", false);
    }
  };
  if (icon) return <ConfirmAction label={`Delete ${icao}`} hint="Delete this airport (only if no listing uses it)" confirmHint={`Yes, delete ${icao}`} onConfirm={run} />;
  return (
    <ConfirmButton confirmLabel={`Delete ${icao}`} onConfirm={run}>
      Delete
    </ConfirmButton>
  );
}
