import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="bg-hero-navy flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-card">
          <h1 className="text-2xl font-extrabold text-ink">Admin console</h1>
          <p className="mt-1 text-sm text-muted">Sign in with a staff account.</p>
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-white/50">Access is restricted to authorised staff. Activity is logged.</p>
      </div>
    </div>
  );
}
