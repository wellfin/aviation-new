import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersClient } from "@/components/admin/users/UsersClient";

export const metadata: Metadata = { title: "System users", description: "Admin-panel accounts: the Super Admin, Admins and staff." };

export default function AdminSystemUsersPage() {
  return (
    <Suspense>
      <UsersClient kind="system" />
    </Suspense>
  );
}
