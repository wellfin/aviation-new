import { getAdvertisement } from "@/lib/data/content";
import { NewsletterCard } from "./NewsletterCard";
import { NewsSponsorCard } from "./NewsSponsorCard";

/** Right rail of the news pages: sponsor card, newsletter signup, second sponsor card. */
export async function NewsSidebar() {
  const [fuel, sidebar] = await Promise.all([getAdvertisement("sponsored-strip"), getAdvertisement("sidebar")]);
  return (
    <div className="flex flex-col gap-5">
      <NewsSponsorCard ad={fuel} icon="⛽" />
      <NewsletterCard />
      <NewsSponsorCard ad={sidebar} icon="🌤️" />
    </div>
  );
}
