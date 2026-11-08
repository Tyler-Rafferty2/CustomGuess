import GalleryPageClient from "./GalleryPageClient";
import { fetchPublicSets, GALLERY_PAGE_SIZE } from "@/lib/gallery";

export const metadata = {
  title: { absolute: "Browse Custom Guess Who Character Sets | CustomGuess" },
  description:
    "Browse community-made Custom Guess Who character sets — anime, movies, games, sports, and more. Pick one and start a free online game instantly.",
  alternates: {
    canonical: "https://customguess.com/gallery",
  },
};

export default async function GalleryPage() {
  // Server-render the first page so the HTML crawlers see contains real links
  // to set pages instead of a "Loading sets…" placeholder.
  const { sets, total } = await fetchPublicSets({ pageSize: GALLERY_PAGE_SIZE });
  return <GalleryPageClient initialSets={sets} initialTotal={total} />;
}
