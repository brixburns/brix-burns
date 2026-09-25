"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useReadContracts } from "wagmi";
import { trixsterAbi, vaultAbi } from "../lib/abi";
import { MAX_PER_CRACK, NET } from "../lib/chain";
import { fmtBrix } from "../lib/format";
import { useLang } from "../lib/i18n";
import { useInView } from "../lib/useInView";
import { useTx } from "../lib/useTx";
import type { VaultState } from "../lib/useVault";
import { Section, TxStatus, useWallet, WalletGate } from "./shared";

const vault = NET.vault as `0x${string}`;
const trixster = NET.trixster as `0x${string}`;

function parseIds(s: string, minted: number): number[] {
  const ids = s.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= minted);
  return [...new Set(ids)];
}

/** Trixsters the address holds on Robinhood Chain. Not enumerable: ownerOf for every minted id. */
function useOwned(address: string | undefined, minted: number) {
  const ids = useMemo(() => Array.from({ length: minted }, (_, i) => i + 1), [minted]);
  const { data, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: trixster, abi: trixsterAbi, functionName: "ownerOf", args: [BigInt(id)], chainId: NET.rhChain.id,
    } as const)),
    query: { enabled: !!address && minted > 0 && !!NET.trixster, refetchInterval: 60_000 },
  });
  const owned = data
    ? ids.filter((_, i) => data[i].status === "success" && (data[i].result as string).toLowerCase() === address!.toLowerCase())
    : [];
  return { owned, loading: isLoading };
}

/** The holder's OpenSea profile: it lists their Trixsters among everything else they own. */
const openseaProfile = (address: string) => `https://opensea.io/${address}`;

const FIVE_MIN = 5 * 60_000;

/**
 * Confirmed cracks the relayer has yet to pay (worker GET /status). The
 * workers' free plan is 100,000 requests a day across all visitors, so ask
 * only with a wallet connected and the crack section on screen, at most every
 * 5 minutes (a hidden tab doesn't poll either), and after an error stop
 * asking instead of retrying.
 */
function usePendingPayouts(active: boolean): number | undefined {
  const { data } = useQuery({
    queryKey: ["relayer-status"],
    queryFn: async () => {
      const res = await fetch(NET.relayerStatus);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { pendingPayouts?: string[] };
      return body.pendingPayouts?.length ?? 0;
    },
    enabled: active && !!NET.relayerStatus,
    staleTime: FIVE_MIN, // scrolling away and back doesn't ask again
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.status === "error" ? false : FIVE_MIN),
  });
  return data;
}

export default function Crack({ v }: { v?: VaultState }) {
  const { t } = useLang();
  const w = useWallet();
  const tx = useTx();
  const minted = v?.minted ?? 0;
  const { owned, loading } = useOwned(w.address, minted);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [manual, setManual] = useState("");
  const [sent, setSent] = useState<Set<number>>(new Set());
  const { ref: cardRef, inView } = useInView<HTMLDivElement>();
  const pending = usePendingPayouts(!!w.address && inView);

  const { data: dowries } = useReadContracts({
    contracts: owned.map((id) => ({
      address: vault, abi: vaultAbi, functionName: "dowryOf", args: [BigInt(id)], chainId: NET.chain.id,
    } as const)),
    allowFailure: false,
    query: { enabled: !!v?.finalized && owned.length > 0 },
  });
  const dowryOf = (id: number) => {
    const i = owned.indexOf(id);
    return dowries && i >= 0 ? (dowries[i] as bigint) : undefined;
  };

  const ids = [...new Set([...picked, ...parseIds(manual, minted)])].filter((id) => !sent.has(id));
  const tooMany = ids.length > MAX_PER_CRACK;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  const toggle = (id: number) => setPicked((p) => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const crack = async () => {
    const batch = ids;
    if (await tx.send({ address: vault, abi: vaultAbi, functionName: "crack", args: [batch.map(BigInt)] })) {
      setSent((s) => new Set([...s, ...batch]));
      setPicked(new Set());
      setManual("");
    }
  };

  return (
    <Section id="crack" title={t.crackTitle} lead={t.crackLead}>
      <div className="mint-card" ref={cardRef}>
        {v && !v.finalized && <div className="mint-warn">{t.crackBlind}</div>}

        {w.address && (
          <div className="qty">
            <div className="mp-label">{t.crackYours}</div>
            {loading ? <div className="qty-note">{t.crackScanning}</div>
              : owned.length === 0 ? <div className="qty-note">{t.crackNone}</div>
              : (
                <div className="trix-grid">
                  {owned.map((id) => {
                    const d = dowryOf(id);
                    const isSent = sent.has(id);
                    return (
                      <button
                        key={id} disabled={isSent}
                        className={`trix-chip${picked.has(id) ? " on" : ""}${isSent ? " sent" : ""}`}
                        onClick={() => toggle(id)}
                      >
                        <span className="tc-id">#{id}</span>
                        {isSent ? <span className="tc-dowry">{t.crackSent}</span>
                          : d !== undefined && <span className="tc-dowry">{d === 0n ? "0" : fmtBrix(d)}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        <div className="qty">
          <input
            className="addr-input" placeholder="7,12,31" aria-label={t.crackManual}
            value={manual} onChange={(e) => setManual(e.target.value.replace(/[^\d,\s]/g, ""))}
          />
          <div className="qty-note">{t.crackManual}</div>
        </div>

        <div className="mint-action">
          <WalletGate>
            {ids.length === 0 ? <button className="act-btn" disabled>{t.crackPick}</button>
              : tooMany ? <button className="act-btn" disabled>{t.crackTooMany}</button>
              : <button className="act-btn act-burn" disabled={busy} onClick={crack}>{t.crackButton(ids.length)}</button>}
          </WalletGate>
          <TxStatus state={tx.state} done={t.crackDone}/>
          <div className="qty-note">{t.crackEoa}</div>
          {w.address && (
            <a className="link-btn link-opensea" href={openseaProfile(w.address)} target="_blank" rel="noopener noreferrer">{t.openseaMine}</a>
          )}
          {!!pending && <div className="qty-note pending-note">{t.pendingDowries(pending)}</div>}
        </div>
      </div>
    </Section>
  );
}
