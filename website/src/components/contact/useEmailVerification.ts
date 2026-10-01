"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";

const NOT_VERIFIED = "Please verify your email address with the OTP before sending.";

/**
 * State for a form whose email must be OTP-verified before it is sent (pairs with <EmailOtp>).
 *
 *   const otp = useEmailVerification();
 *   <EmailOtp key={otp.mountKey} {...otp.fieldProps} endpoints={…} />
 *   onValid: (data) => otp.submitVerified(data.email, () => apiPost(…, data))
 */
export function useEmailVerification() {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  // Bumped to discard a verification the server rejected, keeping what the user typed.
  const [resetKey, setResetKey] = useState(0);
  // Bumped after a successful send so the field starts empty again.
  const [mountKey, setMountKey] = useState(0);

  async function submitVerified<T>(email: string, send: () => Promise<T>): Promise<T> {
    if (verifiedEmail?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new ApiError(422, { code: "EMAIL_NOT_VERIFIED", message: NOT_VERIFIED, fieldErrors: { email: NOT_VERIFIED } });
    }
    try {
      const result = await send();
      // Each verification is single-use.
      setVerifiedEmail(null);
      setMountKey((k) => k + 1);
      return result;
    } catch (err) {
      // The verification expired or was already used: ask for a fresh code.
      if (err instanceof ApiError && err.body.code === "EMAIL_NOT_VERIFIED") {
        setVerifiedEmail(null);
        setResetKey((n) => n + 1);
      }
      throw err;
    }
  }

  return { submitVerified, mountKey, fieldProps: { onVerifiedChange: setVerifiedEmail, resetKey } };
}
