import HomePageClient from "./HomePageClient";
import { fetchPublicSets, GALLERY_PAGE_SIZE } from "@/lib/gallery";
import { HOME_FAQ, homeFaqJsonLd } from "@/lib/faq";

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      <HomePageClient popularSets={sets.slice(0, 6)} faq={HOME_FAQ} />
    </>
  );
}
