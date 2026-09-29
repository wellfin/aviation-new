"use client";

/** Minimal typing for Razorpay Checkout (https://razorpay.com/docs/payments/subscriptions/integration-guide/). */

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; escape?: boolean };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (response: { error?: { description?: string } }) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<RazorpayConstructor> | null = null;

/** Injects checkout.js once and resolves with the Razorpay constructor. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to initialise")));
    script.onerror = () => {
      script.remove();
      reject(new Error("Couldn't load the payment window. Check your connection or disable blockers and try again."));
    };
    document.body.appendChild(script);
  }).catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}

export type CheckoutOutcome = { kind: "success"; response: RazorpaySuccess } | { kind: "dismissed" } | { kind: "failed"; message: string };

/** Opens Checkout for a subscription and resolves when the customer pays, fails or closes it. */
export async function openSubscriptionCheckout(options: Omit<RazorpayOptions, "handler" | "modal">): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpay();
  return new Promise<CheckoutOutcome>((resolve) => {
    let failure: string | null = null;
    const rzp = new Razorpay({
      ...options,
      handler: (response) => resolve({ kind: "success", response }),
      modal: { ondismiss: () => resolve(failure ? { kind: "failed", message: failure } : { kind: "dismissed" }) },
    });
    rzp.on("payment.failed", (r) => {
      failure = r.error?.description ?? "The payment failed. No money was taken.";
    });
    rzp.open();
  });
}
