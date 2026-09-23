import { formatUnits } from "viem";

/** Whole-token amount with thousands separators, no decimals. */
export function fmtBrix(wei: bigint): string {
  return Number(formatUnits(wei, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** BNB with enough significant digits to stay readable when tiny. */
export function fmtBnb(wei: bigint, digits = 4): string {
  const n = Number(formatUnits(wei, 18));
  if (n === 0) return "0";
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: digits });
  const decimals = Math.min(18, digits - 1 - Math.floor(Math.log10(n)));
  return n.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}

/** Floor of 1M $BRIX in BNB: one $BRIX is far too small to read. */
export function fmtFloorPerMillion(floor: bigint): string {
  return fmtBnb(floor * 1_000_000n);
}

export function fmtPct(part: bigint, whole: bigint): string {
  if (whole === 0n) return "0.00%";
  return `${(Number((part * 1_000_000n) / whole) / 10_000).toFixed(2)}%`;
}

export function fmtCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "00:00:00";
  const d = Math.floor(secondsLeft / 86_400);
  const h = Math.floor((secondsLeft % 86_400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  const hms = [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
  return d > 0 ? `${d}D ${hms}` : hms;
}
