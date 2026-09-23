"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { NET } from "../lib/chain";
import { fmtBrix, fmtPct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { Usd } from "../lib/prices";
import type { VaultState } from "../lib/useVault";

const SHOWN = 10;
const FETCHED = 500; // the worker's maximum: enough to find the connected wallet's rank

type Row = { rank: number; address: string; burned: bigint };

/**
 * The worker recounts every 5 minutes, so asking more often is wasted: its
 * free plan is 100,000 requests a day across all visitors. After an error,
 * stop asking instead of retrying.
 */
function useTop() {
  return useQuery({
    queryKey: ["burners-top"],
    queryFn: async (): Promise<Row[]> => {
      const res = await fetch(`${NET.burnersTop}?limit=${FETCHED}`);
      if (!res.ok) throw new Error(`top ${res.status}`);
      const body = (await res.json()) as { top: { rank: number; address: string; burned: string }[] };
      return body.top.map((r) => ({ rank: r.rank, address: r.address.toLowerCase(), burned: BigInt(r.burned) }));
    },
    enabled: !!NET.burnersTop,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.status === "error" ? false : 5 * 60_000),
  });
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function TopBurners({ v, preview }: { v?: VaultState; preview?: boolean }) {
  const { t } = useLang();
  const { address } = useAccount();
  const { data: rows } = useTop();
  const me = address?.toLowerCase();

  const top = rows?.slice(0, SHOWN) ?? [];
  const mine = me ? rows?.find((r) => r.address === me) : undefined;
  const showMine = mine && mine.rank > SHOWN;
  const totalBurned = v?.burned ?? 0n;

  const line = (r: Row, you: boolean) => (
    <tr key={r.address} className={you ? "you" : ""}>
      <td className="tb-rank">{r.rank}</td>
      <td className="tb-wallet">
        <a href={`${NET.chain.blockExplorers.default.url}/address/${r.address}`} target="_blank" rel="noopener noreferrer">{short(r.address)}</a>
        {you && <span className="tb-you">{t.topYou}</span>}
      </td>
      <td className="tb-num"><Usd brix={r.burned}>{fmtBrix(r.burned)}</Usd></td>
      <td className="tb-num tb-share">{totalBurned > 0n ? fmtPct(r.burned, totalBurned) : "—"}</td>
    </tr>
  );

  return (
    <section className="panel" id="top-burners">
      {preview && <div className="preview-badge">{t.topPreview}</div>}
      <h2 className="panel-title">{t.topTitle}</h2>
      <p className="panel-lead">{t.topLead}</p>

      {rows && rows.length === 0 ? (
        <p className="qty-note tb-empty">{t.topEmpty}</p>
      ) : (
        <div className="tb-wrap">
          <table className="tb">
            <thead>
              <tr>
                <th className="tb-rank">{t.topRank}</th>
                <th>{t.topWallet}</th>
                <th className="tb-num">{t.topBurned}</th>
                <th className="tb-num tb-share">{t.topShare}</th>
              </tr>
            </thead>
            <tbody>
              {rows ? top.map((r) => line(r, r.address === me)) : (
                <tr><td colSpan={4} className="tb-loading">—</td></tr>
              )}
              {showMine && (
                <>
                  <tr className="tb-gap"><td colSpan={4}>⋯</td></tr>
                  {line(mine, true)}
                </>
              )}
            </tbody>
          </table>
          {me && rows && !mine && (
            <p className="qty-note tb-empty">{rows.length < FETCHED ? t.topNotRanked : t.topOutside(FETCHED)}</p>
          )}
        </div>
      )}
    </section>
  );
}
