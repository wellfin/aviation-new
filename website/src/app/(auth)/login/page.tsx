import type { Metadata } from "next";
import { AuthSwitch } from "@/components/auth/AuthBits";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { LoginDemoHint } from "@/components/auth/DemoHints";
import { LoginForm } from "@/components/auth/LoginForm";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Global Aviation Services Directory account.",
  robots: { index: false, follow: true },
};

/** Messages for `?error=` codes set by the API's OAuth callback. */
const OAUTH_ERRORS: Record<string, string> = {
  oauth_state: "Your sign-in session expired. Please try again.",
  oauth_failed: "We couldn't complete social sign-in. Please try again or use your email.",
  oauth_email: "Your social account's email address isn't verified. Verify it with the provider or sign in with email.",
  account_suspended: "This account has been suspended. Please contact support.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const notice = firstParam(sp.reset) === "1" ? "Your password has been updated. Sign in with your new password." : undefined;
  const oauthError = OAUTH_ERRORS[firstParam(sp.error) ?? ""];

  return (
    <>
      <AuthHeading title="Welcome back 👋" subtitle="Sign in to your aviation command centre" />
      <LoginForm next={firstParam(sp.next)} notice={notice} error={oauthError} />
      <AuthSwitch prompt="Don't have an account?" href="/signup" cta="Create free account" />
      <LoginDemoHint />
    </>
  );
}
