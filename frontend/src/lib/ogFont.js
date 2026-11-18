// Fraunces 900 bundled locally for next/og ImageResponse.
// Satori can't parse woff2, and remote font URLs can 404 — either one makes
// the OG route return an empty 200 that Vercel then caches as immutable.
export function loadFraunces() {
  return fetch(new URL("../assets/fonts/Fraunces-Black.ttf", import.meta.url)).then((r) => r.arrayBuffer());
}
