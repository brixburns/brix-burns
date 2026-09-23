"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createConfig, http, type Transport, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { NET } from "./lib/chain";
import { LangProvider } from "./lib/i18n";

// Injected wallets only (MetaMask, Rabby, Trust, Binance Wallet…): cracking
// needs a plain EOA anyway, see BRIX_design_v1.md §7.
const config = createConfig({
  // Robinhood is read-only here: ownership of Trixsters for the crack list.
  chains: [NET.chain, NET.rhChain],
  connectors: [injected()],
  transports: {
    [NET.chain.id]: http(NET.rpc),
    [NET.rhChain.id]: http(NET.rhRpc),
  } as Record<typeof NET.chain.id | typeof NET.rhChain.id, Transport>,
  ssr: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LangProvider>{children}</LangProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
