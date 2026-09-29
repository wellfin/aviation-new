import type { Metadata } from "next";
import { FavoritesList } from "@/components/account/FavoritesList";

export const metadata: Metadata = {
  title: "Favourites",
  description: "Aviation service providers you've saved.",
};

export default function FavoritesPage() {
  return <FavoritesList />;
}
