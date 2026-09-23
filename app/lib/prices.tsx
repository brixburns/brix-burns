"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { portalAbi } from "./abi";
import { NET } from "./chain";

type Prices = { bnbUsd?: number; brixBnb?: number };
const PricesContext = createContext<Prices>({});

/**
 * USD reference for the hover tooltips. BNB/USD from Binance; $BRIX in BNB from
 * Flap's Portal while on the curve, from DexScreener once graduated. No source,
 * no number: a missing price hides the tooltip rather than guessing.
 */
export function PricesProvider({ children }: { children: React.ReactNode }) {
  const { data: bnbUsd } = useQuery({
    queryKey: ["bnb-usd"],
    queryFn: async () => {
      const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
      return Number(((await res.json()) as { price: string }).price) || undefined;
    },
    refetchInterval: 60_000,
  });

  const { data: curve } = useReadContract({
    address: NET.portal as `0x${string}`, abi: portalAbi, functionName: "getTokenV2",
    args: [NET.token as `0x${string}`], chainId: NET.chain.id,
    query: { enabled: !!NET.token, refetchInterval: 30_000 },
  });
  const onCurve = curve?.[0] === 1;

  const { data: dexPrice } = useQuery({
    queryKey: ["brix-dex"],
    queryFn: async () => {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${NET.token}`);
      const pairs = ((await res.json()) as { pairs?: { priceNative?: string; liquidity?: { usd?: number } }[] }).pairs ?? [];
      const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      return best?.priceNative ? Number(best.priceNative) : undefined;
    },
    enabled: curve?.[0] === 4,
    refetchInterval: 60_000,
  });

  const brixBnb = onCurve ? Number(formatUnits(curve[3], 18)) : dexPrice;
  return <PricesContext.Provider value={{ bnbUsd, brixBnb }}>{children}</PricesContext.Provider>;
}

export const usePrices = () => useContext(PricesContext);

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toPrecision(2)}`;
}

/** Wraps an amount; hovering (or tapping) it shows its value in dollars. */
export function Usd({ bnb, brix, children }: { bnb?: bigint; brix?: bigint; children: React.ReactNode }) {
  const { bnbUsd, brixBnb } = usePrices();
  let usd: number | undefined;
  if (bnb !== undefined && bnbUsd) usd = Number(formatUnits(bnb, 18)) * bnbUsd;
  if (brix !== undefined && bnbUsd && brixBnb) usd = Number(formatUnits(brix, 18)) * brixBnb * bnbUsd;
  if (usd === undefined) return <>{children}</>;
  return (
    <span className="usd" tabIndex={0} data-usd={`≈ ${fmtUsd(usd)}`}>{children}</span>
  );
}
