import { Fraunces, DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { PresenceProvider } from "@/context/PresenceContext";
import { API_URL } from "@/lib/api";

const GA_MEASUREMENT_ID = "G-Q90RJ7CMSH";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  display: "optional",
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
    default: "CustomGuess – Play Custom Guess Who Online Free",
    template: "%s | CustomGuess",
  },
  description:
    "Play custom Guess Who online free with a friend. Make your own Guess Who board from any photos, share a code, and play 2-player in your browser. No sign-up needed to play.",
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
    title: "CustomGuess – Play Custom Guess Who Online Free",
    description:
      "Create custom character sets and play Guess Who online with friends. Ask yes/no questions, eliminate suspects, win. Free to play.",
    url: "https://customguess.com",
    siteName: "CustomGuess",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CustomGuess – Play Custom Guess Who Online Free",
    description: "Custom Guess Who online. Create your own characters, invite a friend, and play for free.",
  },
  verification: {
    google: "krRAsrBrHBYFsLTQKmjxQPYpR0vHAP6_LfGL4SC2njo",
  },
  metadataBase: new URL("https://customguess.com"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
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
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8175008196050957"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          async
          defer
          data-website-id="82b27817-dfc1-424d-af39-bea327b77cbb"
          src={`${API_URL}/analytics-collect/script.js`}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <UserProvider><PresenceProvider>{children}</PresenceProvider></UserProvider>
      </body>
    </html>
  );
}
