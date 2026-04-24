export default function sitemap() {
  const base = "https://customguess.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/lobby`, lastModified: new Date(), changeFrequency: "always", priority: 0.8 },
    { url: `${base}/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
