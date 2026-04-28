import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

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
    default: "CustomGuess – Play Custom Guess Who Online",
    template: "%s | CustomGuess",
  },
  description:
    "Play custom Guess Who online with friends. Create your own character sets, invite a friend, and ask yes/no questions to find their secret character before they find yours. Free, no download needed.",
  keywords: [
    "custom guess who",
    "custom guess who online",
    "guess who online",
    "play guess who online",
    "guess who game",
    "customguess",
    "deduction game",
    "multiplayer",
    "online game",
    "custom characters",
  ],
  openGraph: {
    title: "CustomGuess – Play Custom Guess Who Online",
    description:
      "Create custom character sets and play Guess Who online with friends. Ask yes/no questions, eliminate suspects, win. Free to play.",
    url: "https://customguess.com",
    siteName: "CustomGuess",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CustomGuess – Play Custom Guess Who Online" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CustomGuess – Play Custom Guess Who Online",
    description: "Custom Guess Who online. Create your own characters, invite a friend, and play for free.",
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

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CustomGuess",
    alternateName: "Custom Guess Who",
    description: "Play custom Guess Who online with friends. Create your own character sets and ask yes/no questions to find the secret character.",
    url: "https://customguess.com",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I play custom Guess Who online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Create a game on CustomGuess, choose a character set (or upload your own photos), share the code with a friend, then take turns asking yes/no questions to identify their secret character.",
        },
      },
      {
        "@type": "Question",
        name: "Can I make my own Guess Who character set?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! CustomGuess lets you upload your own photos and create fully custom character sets. Use celebrities, friends, family, or any images you like.",
        },
      },
      {
        "@type": "Question",
        name: "Is CustomGuess free to play?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, CustomGuess is completely free to play. No download or account required — just create a game and share the code with a friend.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account to play custom Guess Who?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No account needed. You can play as a guest instantly. Creating an account lets you save your custom character sets and track your game history.",
        },
      },
    ],
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <UserProvider>{children}</UserProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
