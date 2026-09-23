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

const orbitron = Orbitron({
  weight: ["700", "900"],
  subsets: ["latin"],
  variable: "--brix-font-orb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description:
    "$BRIX on BNB Chain: every token backed by a BNB reserve. Burn it and the floor rises. Plus 2,222 Trixsters on Robinhood Chain, each holding a dowry.",
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
