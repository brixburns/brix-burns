import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description:
    "Born from the blockchain, BRIX by BRIX. 3,333 unique NFTs on Solana — forged in fire, fueled by $BRIX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}