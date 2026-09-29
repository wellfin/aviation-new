import type { Metadata } from "next";
import { SecurityForm } from "@/components/account/SecurityForm";

export const metadata: Metadata = {
  title: "Security",
  description: "Change your password and manage where you're signed in.",
};

export default function SecurityPage() {
  return <SecurityForm />;
}
