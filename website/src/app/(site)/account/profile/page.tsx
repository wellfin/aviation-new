import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
  description: "Edit your name, phone number and company.",
};

export default function ProfilePage() {
  return <ProfileForm />;
}
