import GalleryPageClient from "./GalleryPageClient";

export const metadata = {
  title: "Browse Custom Guess Who Character Sets | CustomGuess",
  description:
    "Browse community-made Custom Guess Who character sets — anime, movies, games, sports, and more. Pick one and start a free online game instantly.",
  alternates: {
    canonical: "https://customguess.com/gallery",
  },
};

export default function GalleryPage() {
  return <GalleryPageClient />;
}
