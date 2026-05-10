import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description:
    "Born from the blockchain, BRIX by BRIX. 3,333 unique NFTs on Solana — forged in fire, fueled by $BRIX.",

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/favicon-v2-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/favicon-v2-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],

    apple: [
      {
        url: "/apple-touch-v3-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
 <head>
  <meta name="theme-color" content="#000000" />

  <link rel="icon" href="/favicon.ico" sizes="any" />

  <link
    rel="icon"
    type="image/png"
    sizes="32x32"
    href="/favicon-v2-32x32.png"
  />

  <link
    rel="icon"
    type="image/png"
    sizes="16x16"
    href="/favicon-v2-16x16.png"
  />

  <link
    rel="apple-touch-icon"
    sizes="180x180"
    href="/apple-touch-v3-icon.png"
  />
</head>

  <body>{children}</body>
</html>
  );
}