import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description: "Born from the blockchain, BRIX by BRIX. 3,333 unique NFTs on Solana — forged in fire, fueled by $BRIX.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
