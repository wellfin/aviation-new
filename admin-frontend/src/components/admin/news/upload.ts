"use client";

import { ApiError, type ApiErrorBody } from "@/lib/api/client";
import { publicConfig } from "@/lib/public-config";

export interface UploadedFile {
  id: string;
  url: string;
  kind: "image" | "document";
  mime: string;
  size: number;
  originalName: string;
  createdAt: string;
}

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const api = (path: string) => `${publicConfig.apiBaseUrl}/api/v1${path}`;

/** Client-side pre-check matching the API's image rules (the API re-checks magic bytes). */
export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Use a PNG, JPEG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "That image is too large (max 5 MB).";
  if (file.size === 0) return "The file is empty.";
  return null;
}

/**
 * Multipart upload to `POST /admin/uploads` (kind=image). Refreshes an expired
 * session once and retries, like `apiRequest` does for JSON calls.
 */
export async function uploadImage(file: File): Promise<UploadedFile> {
  const send = () => {
    const fd = new FormData();
    fd.append("kind", "image");
    fd.append("file", file);
    return fetch(api("/admin/uploads"), { method: "POST", credentials: "include", body: fd, headers: { Accept: "application/json" } });
  };

  let res: Response;
  try {
    res = await send();
    if (res.status === 401) {
      const refreshed = await fetch(api("/admin/auth/refresh"), { method: "POST", credentials: "include", headers: { Accept: "application/json" } }).catch(() => null);
      if (refreshed?.ok) res = await send();
    }
  } catch {
    throw new ApiError(0, { code: "NETWORK", message: "Couldn't reach the server. Check your connection." });
  }

  const payload = (await res.json().catch(() => null)) as { data?: UploadedFile; error?: ApiErrorBody } | null;
  if (!res.ok || !payload?.data) {
    throw new ApiError(res.status, payload?.error ?? { code: "UNKNOWN", message: "The upload failed. Please try again." });
  }
  return payload.data;
}
