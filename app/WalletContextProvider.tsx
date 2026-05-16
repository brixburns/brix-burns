"use client";

import { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Importa gli stili del modal wallet (bottone "Select Wallet" ecc.)
import "@solana/wallet-adapter-react-ui/styles.css";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Cambia in WalletAdapterNetwork.Mainnet per la produzione
const NETWORK = WalletAdapterNetwork.Devnet;
// ─────────────────────────────────────────────────────────────────────────────

export default function WalletContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(() => clusterApiUrl(NETWORK), []);
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