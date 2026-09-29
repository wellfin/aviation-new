import { env } from "../../config/env.js";
import { AppError, serviceUnavailable } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const API_BASE = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 15_000;

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/** API credentials, or a 503 when payments are not configured on this deployment. */
export function razorpayCredentials(): RazorpayCredentials {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw serviceUnavailable("Payments are not configured");
  return { keyId, keySecret };
}

export function webhookSecret(): string {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw serviceUnavailable("Payments are not configured");
  return env.RAZORPAY_WEBHOOK_SECRET;
}

/** The fields of a Razorpay subscription entity we rely on (API responses and webhook payloads). */
export interface RazorpaySubscription {
  id: string;
  plan_id?: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: Record<string, string> | unknown[];
}

async function call<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  const { keyId, keySecret } = razorpayCredentials();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    logger.error({ err, path }, "Razorpay request failed");
    throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider is unavailable. Please try again.");
  }
  const json = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    // Razorpay error bodies contain only codes/descriptions, never credentials.
    const error = (json as { error?: { code?: string; description?: string } }).error;
    logger.warn({ status: res.status, path, code: error?.code, description: error?.description }, "Razorpay API error");
    throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider rejected the request. Please try again or contact support.");
  }
  return json as T;
}

export function createRazorpaySubscription(input: {
  planId: string;
  totalCount: number;
  notes: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return call("POST", "/subscriptions", {
    plan_id: input.planId,
    total_count: input.totalCount,
    quantity: 1,
    customer_notify: 1,
    notes: input.notes,
  });
}

/** Cancels at the end of the paid cycle so the provider keeps what they paid for. */
export function cancelRazorpaySubscription(id: string, atCycleEnd: boolean): Promise<RazorpaySubscription> {
  return call("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });
}
