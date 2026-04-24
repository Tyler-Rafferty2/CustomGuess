export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/lobby", "/signin", "/signup"],
        disallow: ["/lobby/", "/profile", "/create", "/set/", "/edit/", "/forgot-password", "/password_reset"],
      },
    ],
    sitemap: "https://guess-who-tau-one.vercel.app/sitemap.xml",
  };
}
