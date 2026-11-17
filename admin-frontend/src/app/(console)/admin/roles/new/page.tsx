import type { Metadata } from "next";
import { RoleEditor } from "@/components/admin/users/RoleEditor";

export const metadata: Metadata = { title: "New role", description: "Create a staff role and choose its permissions." };

export default function AdminNewRolePage() {
  return <RoleEditor />;
}
