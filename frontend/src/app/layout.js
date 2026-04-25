import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { Analytics } from "@vercel/analytics/next";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  icons: {
    icon: "/logo.svg",
  },
  title: {
    default: "CustomGuess – Multiplayer Deduction Game",
    template: "%s | CustomGuess",
  },
  description:
    "Play CustomGuess online with your own custom characters. Create a game, invite a friend, and ask yes/no questions to find their secret character before they find yours.",
  keywords: ["customguess", "deduction game", "multiplayer", "online game", "custom characters"],
  openGraph: {
    title: "CustomGuess – Multiplayer Deduction Game",
    description:
      "Create custom character sets and play a real-time deduction game with friends. Ask questions, eliminate suspects, win.",
    url: "https://customguess.com",
    siteName: "CustomGuess",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CustomGuess – Multiplayer Deduction Game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CustomGuess – Multiplayer Deduction Game",
    description: "Custom real-time deduction game. Create, invite, and play.",
    images: ["/opengraph-image"],
  },
  verification: {
    google: "krRAsrBrHBYFsLTQKmjxQPYpR0vHAP6_LfGL4SC2njo",
  },
  metadataBase: new URL("https://customguess.com"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <UserProvider>{children}</UserProvider>
        <Analytics />
      </body>
    </html>
  );
}
