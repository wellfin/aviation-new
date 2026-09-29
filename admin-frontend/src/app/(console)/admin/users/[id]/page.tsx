import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserDetailClient } from "@/components/admin/users/UserDetailClient";

export const metadata: Metadata = { title: "User", description: "User account details, role and access." };

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  return <UserDetailClient id={id} />;
}
