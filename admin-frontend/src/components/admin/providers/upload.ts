"use client";

import { ApiError, apiRequest, type ApiErrorBody } from "@/lib/api/client";
import { publicConfig } from "@/lib/public-config";

export type UploadKind = "image" | "document";

export interface UploadedFile {
  id: string;
  url: string;
  kind: UploadKind;
  mime: string;
  size: number;
  originalName: string;
  createdAt: string;
}

export const UPLOAD_ACCEPT: Record<UploadKind, string> = {
  image: "image/png,image/jpeg,image/webp",
  document: "application/pdf",
};

function send(kind: UploadKind, file: File): Promise<Response> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);
  return fetch(`${publicConfig.apiBaseUrl}/api/v1/admin/uploads`, { method: "POST", credentials: "include", body });
}

/** POST /admin/uploads (multipart). Refreshes an expired session once, like `apiRequest`. */
export async function uploadFile(kind: UploadKind, file: File): Promise<UploadedFile> {
  let res: Response;
  try {
    res = await send(kind, file);
    if (res.status === 401) {
      const refreshed = await apiRequest("POST", "/admin/auth/refresh").then(
        () => true,
        () => false,
      );
      if (refreshed) res = await send(kind, file);
    }
  } catch {
    throw new ApiError(0, { code: "NETWORK", message: "Couldn't reach the server. Check your connection." });
  }
  const payload = (await res.json().catch(() => null)) as { data?: UploadedFile; error?: ApiErrorBody } | null;
  if (!res.ok || !payload?.data) {
    const error = payload?.error ?? { code: "UNKNOWN", message: "Upload failed. Please try again." };
    // Surface the per-file reason (type/size) as the message.
    throw new ApiError(res.status, { ...error, message: error.fieldErrors?.file ?? error.message });
  }
  return payload.data;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
