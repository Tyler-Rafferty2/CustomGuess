import HomePageClient from "./HomePageClient";
import { fetchPublicSets, GALLERY_PAGE_SIZE } from "@/lib/gallery";

export const metadata = {
  alternates: {
    canonical: "https://customguess.com",
  },
};

export default async function Page() {
  // Popular sets are server-rendered into the homepage so crawlers can reach
  // set pages from the site's strongest page.
  // Same query as the /gallery first page so both share one cache entry.
  const { sets } = await fetchPublicSets({ pageSize: GALLERY_PAGE_SIZE });
  return <HomePageClient popularSets={sets.slice(0, 6)} />;
}
