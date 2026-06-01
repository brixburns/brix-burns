"use client";

import { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const NETWORK   = WalletAdapterNetwork.Mainnet;
const ENDPOINT  = "https://mainnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
// ─────────────────────────────────────────────────────────────────────────────

export default function WalletContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(() => ENDPOINT, []);
  // Phantom (and other Solana wallets) auto-register via the Wallet Standard.
  // No need to instantiate adapter classes manually — they're auto-detected.
  const wallets  = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}