import type { Metadata } from "next";
import { AdminForgotPassword } from "@/components/admin/AdminForgotPassword";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Reset password" };

export default function AdminForgotPasswordPage() {
  return (
    <div className="bg-hero-navy flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-card">
          <h1 className="text-2xl font-extrabold text-ink">Reset password</h1>
          <p className="mt-1 text-sm text-muted">We&apos;ll email a code to your staff account, then you choose a new password.</p>
          <AdminForgotPassword />
        </div>
        <p className="mt-6 text-center text-xs text-white/50">Access is restricted to authorised staff. Activity is logged.</p>
      </div>
    </div>
  );
}
