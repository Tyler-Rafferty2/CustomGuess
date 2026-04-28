export default function sitemap() {
  const base = "https://customguess.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
}
