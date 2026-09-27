"use client";

import { usePrices } from "./prices";

/**
 * FLOOR / PRICE: how much of the market price the BNB reserve stands behind.
 * It rises over time, since the floor never falls. Burning beats selling when
 * 95% of the floor (redeem) beats the price minus the 3% tax, i.e. when
 * floor / price > 0.97 / 0.95 ≈ 102.1%. Slippage aside.
 */
export const BURN_ABOVE = 0.97 / 0.95;

/** Floor as a share of the market price (1 = at the price). Undefined without a price or a floor. */
export function useFloorToPrice(floor?: bigint): number | undefined {
  const { brixBnb } = usePrices();
  if (!floor || !brixBnb) return undefined;
  return (Number(floor) / 1e18) / brixBnb;
}

/** 38%, 4.2%, 0.037%: early on the floor can be a tiny share of the price. */
export function fmtRatio(r: number): string {
  const pct = r * 100;
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `${Number(pct.toPrecision(2))}%`;
}
