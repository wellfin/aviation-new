import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersClient } from "@/components/admin/users/UsersClient";

export const metadata: Metadata = { title: "Users", description: "Manage user accounts, roles and access." };

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersClient />
    </Suspense>
  );
}
