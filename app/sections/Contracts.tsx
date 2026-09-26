"use client";

import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";
import { lockAbi } from "../lib/abi";
import { INITIAL_SUPPLY, NET } from "../lib/chain";
import { fmtBrix, fmtCountdown, fmtPct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { Usd } from "../lib/prices";

const devLock = NET.devLock as `0x${string}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * The dev reserve's TokenLock, straight from the chain: how much it holds,
 * when it opens and the one wallet it can pay. The date and the wallet are
 * immutable, so the countdown runs locally; `locked` is re-read now and then.
 */
function useDevLock() {
  const { data } = useReadContracts({
    contracts: (["locked", "unlockAt", "beneficiary"] as const).map((functionName) => ({
      address: devLock, abi: lockAbi, functionName, chainId: NET.chain.id,
    })),
    allowFailure: false,
    query: { enabled: !!NET.devLock, refetchInterval: 10 * 60_000, refetchOnWindowFocus: false },
  });
  if (!data) return undefined;
  const [locked, unlockAt, beneficiary] = data as unknown as [bigint, bigint, string];
  return { locked, unlockAt: Number(unlockAt), beneficiary };
}

function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Address({ address, chain, copied, onCopy, copyLabel }: {
  address: string; chain: typeof NET.chain | typeof NET.rhChain; copied: boolean; onCopy: () => void; copyLabel: string;
}) {
  return (
    <span className="cr-addr">
      <a href={`${chain.blockExplorers?.default.url}/address/${address}`} target="_blank" rel="noopener noreferrer">{address}</a>
      <button className="copy-btn" onClick={onCopy} aria-label={copyLabel}>{copied ? "✓" : copyLabel}</button>
    </span>
  );
}

/** The only official addresses: the FAQ and the social posts point here. */
export default function Contracts() {
  const { t } = useLang();
  const [copied, setCopied] = useState("");
  const lock = useDevLock();
  const now = useNow();

  const rows = [
    { label: t.contractToken, address: NET.token, chain: NET.chain },
    { label: t.contractVault, address: NET.vault, chain: NET.chain },
    { label: t.contractTrixster, address: NET.trixster, chain: NET.rhChain },
    { label: t.contractDevLock, address: NET.devLock, chain: NET.chain },
  ];

  const copy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied((c) => (c === address ? "" : c)), 1600);
  };

  return (
    <div className="contracts">
      <div className="mp-label">{t.contractsTitle}</div>
      {rows.map((r) => (
        <div className="contract-row" key={r.label}>
          <span className="cr-label">{r.label} <span className="cr-chain">· {r.chain.name}</span></span>
          {r.address
            ? <Address address={r.address} chain={r.chain} copied={copied === r.address} onCopy={() => copy(r.address)} copyLabel={t.copy}/>
            : <span className="cr-soon">{t.contractsSoon}</span>}
        </div>
      ))}

      {lock && (
        <div className="dev-lock">
          <p className="dl-note">{t.lockNote}</p>
          <div className="dl-facts">
            <div>
              <div className="mp-label">{t.lockLocked}</div>
              <div className="dl-value">
                <Usd brix={lock.locked}>{fmtBrix(lock.locked)} $BRIX</Usd>
                <span className="dl-pct"> · {fmtPct(lock.locked, INITIAL_SUPPLY)}</span>
              </div>
            </div>
            <div>
              <div className="mp-label">{lock.unlockAt > now ? t.lockUnlocksIn : t.lockUnlocked}</div>
              <div className="dl-value">
                {lock.unlockAt > now ? fmtCountdown(lock.unlockAt - now) : new Date(lock.unlockAt * 1000).toISOString().slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="mp-label">{t.lockTo}</div>
              <div className="dl-value">
                <a href={`${NET.chain.blockExplorers.default.url}/address/${lock.beneficiary}`} target="_blank" rel="noopener noreferrer">
                  {short(lock.beneficiary)}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
