import type { Metadata } from "next";
import { UserCreateClient } from "@/components/admin/users/UserCreateClient";

export const metadata: Metadata = { title: "Add user", description: "Create an account and choose its role." };

export default function AdminNewUserPage() {
  return <UserCreateClient />;
}
