import type { Metadata } from "next";
import { Share_Tech_Mono, Barlow_Condensed, Orbitron } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--brix-font-mono",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--brix-font-cond",
  display: "swap",
});

// Orbitron is a variable font: asking for 700 and 900 separately gets the same
// file twice from Google, which breaks next/font's build. One variable entry
// covers every weight.
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--brix-font-orb",
  display: "swap",
});

const DESCRIPTION =
  "$BRIX on BNB Chain: every token backed by a BNB reserve. Burn it and the floor rises. Plus 2,222 Trixsters on Robinhood Chain, each holding a dowry.";

export const metadata: Metadata = {
  metadataBase: new URL("https://brix-burns.com"),
  title: "$BRIX Burns",
  description: DESCRIPTION,
  // The image is rendered at build time by app/og.png/route.tsx.
  openGraph: {
    title: "$BRIX BURNS. THE FLOOR RISES.", description: DESCRIPTION, url: "/", siteName: "$BRIX Burns", type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "$BRIX BURNS. THE FLOOR RISES." }],
  },
  twitter: {
    card: "summary_large_image", site: "@BRIX_burns", title: "$BRIX BURNS. THE FLOOR RISES.", description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${shareTechMono.variable} ${barlowCondensed.variable} ${orbitron.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
