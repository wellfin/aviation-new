import type { Metadata } from "next";
import { RolesClient } from "@/components/admin/users/RolesClient";

export const metadata: Metadata = { title: "Roles & permissions", description: "Custom staff roles and what each can do." };

export default function AdminRolesPage() {
  return <RolesClient />;
}
