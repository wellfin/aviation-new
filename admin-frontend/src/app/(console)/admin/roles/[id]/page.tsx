import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoleEditor } from "@/components/admin/users/RoleEditor";

export const metadata: Metadata = { title: "Role", description: "A staff role and its permissions." };

export default async function AdminRolePage({ params }: PageProps<"/admin/roles/[id]">) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  return <RoleEditor id={id} />;
}
