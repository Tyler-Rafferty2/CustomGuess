import HomePageClient from "./HomePageClient";

export const metadata = {
  alternates: {
    canonical: "https://customguess.com",
  },
};

export default function Page() {
  return <HomePageClient />;
}
