"use client";

import { useReadContracts } from "wagmi";
import { vaultAbi } from "./abi";
import { INITIAL_SUPPLY, NET } from "./chain";

const REFRESH_MS = 15_000;

const READS = [
  "floor", "reserve", "effectiveSupply", "potBrix", "potBnb", "minted",
  "mintStart", "mintOpen", "MINT_WINDOW", "REVEAL_DELAY", "shuffleBlock", "finalized",
] as const;

export type VaultState = {
  floor: bigint;        // BNB wei per whole $BRIX, scaled 1e18
  reserve: bigint;
  supply: bigint;
  burned: bigint;
  potBrix: bigint;
  potBnb: bigint;
  minted: number;
  mintOpen: boolean;
  mintEnd: number;      // unix seconds
  revealAt: number;     // unix seconds, estimated from the scheduled close
  closed: boolean;
  finalized: boolean;
};

export function useVault(): { data?: VaultState; error: boolean } {
  const { data, isError } = useReadContracts({
    contracts: READS.map((functionName) => ({
      address: NET.vault as `0x${string}`, abi: vaultAbi, functionName, chainId: NET.chain.id,
    })),
    allowFailure: false,
    query: { enabled: !!NET.vault, refetchInterval: REFRESH_MS },
  });
  if (!data) return { error: isError };

  const [floor, reserve, supply, potBrix, potBnb, minted, mintStart, mintOpen, window, reveal, shuffleBlock, finalized] =
    data as unknown as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, bigint, bigint, bigint, boolean];
  const mintEnd = Number(mintStart + window);
  return {
    error: false,
    data: {
      floor, reserve, supply, potBrix, potBnb,
      burned: INITIAL_SUPPLY - supply,
      minted: Number(minted),
      mintOpen,
      mintEnd,
      revealAt: mintEnd + Number(reveal),
      closed: shuffleBlock > 0n || !mintOpen,
      finalized,
    },
  };
}
