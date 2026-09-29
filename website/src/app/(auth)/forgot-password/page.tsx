import type { Metadata } from "next";
import { AuthSwitch } from "@/components/auth/AuthBits";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { BackToSignIn } from "@/components/auth/BackToSignIn";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Forgot your password? We'll email you a secure code to reset it.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <BackToSignIn />
      <div className="pt-7">
        <AuthHeading
          centered
          icon="🔐"
          title="Reset your password"
          subtitle={
            <>
              Enter your email and we&apos;ll send a secure
              <br className="hidden sm:block" /> code to reset your password
            </>
          }
        />
      </div>
      <ForgotPasswordForm />
      <AuthSwitch prompt="Remembered your password?" href="/login" cta="Sign in" />
    </>
  );
}
