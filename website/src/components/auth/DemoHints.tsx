"use client";

import { MOCK_DEMO_ACCOUNT, MOCK_OTP } from "@/lib/auth/auth-context";
import { MockHint } from "./AuthBits";

/** Demo credentials hint for the login screen (mock mode only). */
export function LoginDemoHint() {
  return (
    <MockHint>
      Sign in with <span className="font-mono break-all text-ink">{MOCK_DEMO_ACCOUNT.email}</span> / <span className="font-mono break-all text-ink">{MOCK_DEMO_ACCOUNT.password}</span>
    </MockHint>
  );
}

export function OtpDemoHint() {
  return (
    <MockHint>
      Your verification code is <span className="font-mono font-semibold text-ink">{MOCK_OTP}</span>
    </MockHint>
  );
}
