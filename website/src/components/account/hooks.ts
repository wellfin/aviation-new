"use client";

import { useApi } from "@/lib/hooks/useApi";
import { publicConfig } from "@/lib/public-config";

/** True when account data comes from the backend (mock mode has no account data to show). */
export const ACCOUNT_API = publicConfig.dataSource === "api";

/** `useApi` that stays idle in mock mode. */
export function useAccountApi<T>(path: string | null) {
  return useApi<T>(ACCOUNT_API ? path : null);
}
