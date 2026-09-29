"use client";

import { ConfirmButton } from "@/components/admin/ui";
import { ApiError, apiRequest } from "@/lib/api/client";

/** Deletes an airport; the API refuses (409 AIRPORT_IN_USE) while listings still reference it. */
export function DeleteAirportButton({ icao, onDeleted, onError }: { icao: string; onDeleted: () => void; onError: (message: string, inUse: boolean) => void }) {
  return (
    <ConfirmButton
      confirmLabel={`Delete ${icao}`}
      onConfirm={async () => {
        try {
          await apiRequest("DELETE", `/admin/airports/${icao}`);
          onDeleted();
        } catch (err) {
          if (err instanceof ApiError && err.body.code === "AIRPORT_IN_USE") onError(`Can't delete ${icao}: ${err.body.message}`, true);
          else onError(err instanceof ApiError ? err.body.message : "Couldn't delete this airport.", false);
        }
      }}
    >
      Delete
    </ConfirmButton>
  );
}
