import { SERVER_API_URL } from "@/lib/api";
import { setGalleryPath } from "@/lib/slug";
import { CATEGORY_PAGES, categoryPath, fetchCategorySets, isIndexableSet } from "@/lib/gallery";

async function gallerySetEntries(base, lastModified) {
  try {
    const res = await fetch(`${SERVER_API_URL}/player/set/public?page=1&pageSize=200&sort=most-popular`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.sets || [])
      .filter(isIndexableSet)
      .map((set) => ({
        url: `${base}${setGalleryPath(set.id, set.name)}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.5,
      }));
  } catch {
    return [];
  }
}

// Only list category pages that are indexable (enough real sets to not be thin).
// If the fetch failed we can't tell, so keep the page listed rather than drop it.
async function categoryEntries(base, lastModified) {
  const results = await Promise.all(CATEGORY_PAGES.map(async (c) => ({ c, ...(await fetchCategorySets(c)) })));
  return results
    .filter((r) => !r.ok || r.indexable)
    .map(({ c }) => ({
      url: `${base}${categoryPath(c.slug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
}

export default async function sitemap() {
  const base = "https://customguess.com";
  const lastModified = new Date();
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/how-to-play`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/gallery`, lastModified, changeFrequency: "daily", priority: 0.7 },
    ...(await categoryEntries(base, lastModified)),
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/lobby`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...(await gallerySetEntries(base, lastModified)),
  ];
}
