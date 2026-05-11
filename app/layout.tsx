import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description:
    "Born from the blockchain, $BRIX by $BRIX. 3,333 unique NFTs on Solana — forged in fire, fueled by $BRIX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}