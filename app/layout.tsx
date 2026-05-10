import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$BRIX Burns",
  description: "Born from the blockchain, BRIX by BRIX. 3,333 unique NFTs on Solana — forged in fire, fueled by $BRIX.",
  icons: {
  icon: [
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/favicon.png", type: "image/png" },
  ],
  apple: "/favicon.png",
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
