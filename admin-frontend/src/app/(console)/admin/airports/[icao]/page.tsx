import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AirportEditor } from "@/components/admin/airports/AirportEditor";

export async function generateMetadata({ params }: PageProps<"/admin/airports/[icao]">): Promise<Metadata> {
  const { icao } = await params;
  return { title: `Edit ${icao.toUpperCase()}`, description: "Edit airport data, runways and frequencies." };
}

export default async function AdminAirportPage({ params }: PageProps<"/admin/airports/[icao]">) {
  const { icao } = await params;
  if (!/^[A-Za-z0-9]{4}$/.test(icao)) notFound();
  return (
    <Suspense>
      <AirportEditor icao={icao.toUpperCase()} />
    </Suspense>
  );
}
