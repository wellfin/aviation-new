import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { robots: { index: false, follow: true } };

/** Split-screen auth shell: navy brand panel on the left, form on the right. No site header/footer. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 grid-cols-[minmax(0,1fr)] bg-[#f7fafc] lg:grid-cols-2">
      <AuthBrandPanel />
      <main id="main" className="flex min-w-0 flex-col">
        <div className="bg-header-gradient px-4 py-4 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
