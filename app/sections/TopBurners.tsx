"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseAbi } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { NET } from "../lib/chain";
import { fmtBnb, fmtBrix, fmtCountdown, fmtPct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { Usd } from "../lib/prices";
import type { VaultState } from "../lib/useVault";

const SHOWN = 10;
const FETCHED = 500; // the worker's maximum: enough to find the connected wallet's rank
const HOUR = 60 * 60_000;
const PRIZE_SPLIT = ["50%", "30%", "20%"];
const WEEK = 7 * 24 * 3600;

const creatorShare = NET.creatorShare as `0x${string}`;
const shareAbi = parseAbi([
  "function start() view returns (uint256)",
  "function period() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function toBurn() view returns (uint256)",
  "function toPrizes() view returns (uint256)",
]);

type Row = { rank: number; address: string; burned: bigint };

/**
 * The worker recounts once an hour, so the site asks once an hour too: its
 * free plan is 100,000 requests a day across all visitors. After an error,
 * stop asking instead of retrying. `round` is a CreatorShare prize round.
 */
function useTop(round?: number) {
  return useQuery({
    queryKey: ["burners-top", round ?? "all"],
    queryFn: async (): Promise<{ rows: Row[]; coveredUntil?: number }> => {
      const q = round === undefined ? "" : `&round=${round}`;
      const res = await fetch(`${NET.burnersTop}?limit=${FETCHED}${q}`);
      if (!res.ok) throw new Error(`top ${res.status}`);
      const body = (await res.json()) as {
        coveredUntil?: number; top: { rank: number; address: string; burned: string }[];
      };
      return {
        coveredUntil: body.coveredUntil,
        rows: body.top.map((r) => ({ rank: r.rank, address: r.address.toLowerCase(), burned: BigInt(r.burned) })),
      };
    },
    enabled: !!NET.burnersTop,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.status === "error" ? false : HOUR),
  });
}

/**
 * The prize round running now and its pool so far: what the CreatorShare has
 * set aside, plus half of what arrived and isn't split yet. The whole pool
 * goes to the round's top three when it ends.
 */
function useRound() {
  const { data } = useReadContracts({
    contracts: (["start", "period", "currentRound", "toBurn", "toPrizes"] as const).map((functionName) => ({
      address: creatorShare, abi: shareAbi, functionName, chainId: NET.chain.id,
    })),
    allowFailure: false,
    query: { enabled: !!NET.creatorShare, refetchInterval: HOUR, refetchOnWindowFocus: false },
  });
  const { data: balance } = useBalance({
    address: creatorShare, chainId: NET.chain.id,
    query: { enabled: !!NET.creatorShare, refetchInterval: HOUR, refetchOnWindowFocus: false },
  });
  if (!data) return undefined;
  const [start, period, round, toBurn, toPrizes] = data as unknown as bigint[];
  const fresh = balance ? balance.value - toBurn - toPrizes : 0n;
  return {
    round: Number(round),
    endsAt: Number(start + (round + 1n) * period),
    weekly: Number(period) === WEEK,
    pool: toPrizes + (fresh > 0n ? fresh / 2n : 0n),
  };
}

function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const clock = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TopBurners({ v }: { v?: VaultState }) {
  const { t } = useLang();
  const { address } = useAccount();
  const now = useNow();
  const round = useRound();
  const [tab, setTab] = useState<"round" | "all">("round");
  const showRound = !!NET.creatorShare && tab === "round";

  const { data: roundTop } = useTop(round?.round);
  const { data: allTop } = useTop();
  const data = showRound ? (round ? roundTop : undefined) : allTop;
  const rows = data?.rows;
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
      {showRound
        ? <td className="tb-num tb-prize">{PRIZE_SPLIT[r.rank - 1] ?? "—"}</td>
        : <td className="tb-num tb-share">{totalBurned > 0n ? fmtPct(r.burned, totalBurned) : "—"}</td>}
    </tr>
  );

  return (
    <section className="panel" id="top-burners">
      <h2 className="panel-title">{t.topTitle}</h2>
      <p className="panel-lead">{NET.creatorShare ? t.topLead : t.topLeadAll}</p>

      {NET.creatorShare && (
        <div className="tb-tabs">
          <button className={`tb-tab${tab === "round" ? " on" : ""}`} onClick={() => setTab("round")}>
            {round && !round.weekly ? t.topRound : t.topWeek}
          </button>
          <button className={`tb-tab${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>{t.topAll}</button>
        </div>
      )}

      {showRound && round && (
        <div className="tb-round">
          <div>
            <div className="mp-label">{t.topPool}</div>
            <div className="tb-pool bnb"><Usd bnb={round.pool}>{fmtBnb(round.pool)} BNB</Usd></div>
          </div>
          <div>
            <div className="mp-label">{t.topEndsIn}</div>
            <div className="tb-ends">{fmtCountdown(round.endsAt - now)}</div>
          </div>
        </div>
      )}

      {rows && rows.length === 0 ? (
        <p className="qty-note tb-empty">{showRound ? (round?.weekly ? t.topEmptyRound : t.topEmptyShortRound) : t.topEmpty}</p>
      ) : (
        <div className="tb-wrap">
          <table className="tb">
            <thead>
              <tr>
                <th className="tb-rank">{t.topRank}</th>
                <th>{t.topWallet}</th>
                <th className="tb-num">{t.topBurned}</th>
                <th className={`tb-num ${showRound ? "tb-prize" : "tb-share"}`}>{showRound ? t.topPrize : t.topShare}</th>
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

      {data?.coveredUntil && <p className="qty-note tb-updated">{t.topUpdated(clock(data.coveredUntil))}</p>}
      {NET.creatorShare && (
        <ul className="tb-rules">
          {t.topRules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
      )}
    </section>
  );
}
