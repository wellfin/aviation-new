import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuiltInRoleEditor } from "@/components/admin/users/BuiltInRoleEditor";

export const metadata: Metadata = { title: "Role", description: "What the built-in Admin or Manager role can do." };

export default async function AdminBuiltInRolePage({ params }: PageProps<"/admin/roles/built-in/[key]">) {
  const { key } = await params;
  if (key !== "ADMIN" && key !== "MANAGER") notFound();
  return <BuiltInRoleEditor roleKey={key} />;
}
