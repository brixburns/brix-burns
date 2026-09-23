"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { erc20Abi, vaultAbi } from "../lib/abi";
import { MAX_PER_WALLET, MAX_TRIXSTERS, MINT_BRIX, MINT_FEE, NET } from "../lib/chain";
import { fmtBnb, fmtBrix } from "../lib/format";
import { useLang } from "../lib/i18n";
import { Usd } from "../lib/prices";
import { useTx } from "../lib/useTx";
import type { VaultState } from "../lib/useVault";
import { Section, TxStatus, useWallet, WalletGate } from "./shared";

const vault = NET.vault as `0x${string}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Mint({ v }: { v?: VaultState }) {
  const { t } = useLang();
  const w = useWallet();
  const tx = useTx();
  const [count, setCount] = useState(1);
  const [last, setLast] = useState<"approve" | "mint">("mint");

  const { data: mintedBy } = useReadContract({
    address: vault, abi: vaultAbi, functionName: "mintedBy", args: [w.address!],
    chainId: NET.chain.id, query: { enabled: !!w.address, refetchInterval: 15_000 },
  });

  const walletLeft = MAX_PER_WALLET - Number(mintedBy ?? 0n);
  const supplyLeft = MAX_TRIXSTERS - (v?.minted ?? 0);
  const max = Math.max(0, Math.min(walletLeft, supplyLeft));
  const n = Math.min(Math.max(count, 1), Math.max(max, 1));

  const needBrix = BigInt(n) * MINT_BRIX;
  const needBnb = BigInt(n) * MINT_FEE;
  const lowBrix = w.brix !== undefined && w.brix < needBrix;
  const lowBnb = w.bnb !== undefined && w.bnb < needBnb;
  const needsApprove = w.allowance !== undefined && w.allowance < needBrix;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  if (v && !v.mintOpen) {
    return (
      <Section id="mint" title={t.mintTitle} lead={t.mintClosedBody}>
        {NET.opensea && (
          <div className="mint-action">
            <a className="btn btn-outline btn-opensea" href={NET.opensea} target="_blank" rel="noopener noreferrer">{t.openseaCollection}</a>
          </div>
        )}
      </Section>
    );
  }

  const approve = () => (setLast("approve"), tx.send({
    address: NET.token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [vault, needBrix],
  }));
  const mint = () => (setLast("mint"), tx.send({
    address: vault, abi: vaultAbi, functionName: "mint", args: [needBrix], value: needBnb,
  }));

  return (
    <Section id="mint" title={t.mintTitle} lead={t.mintLead}>
      <div className="mint-card">
        {/* price */}
        <div className="mint-price">
          <div className="mp-label">{t.mintPrice}</div>
          <div className="mp-value">
            <Usd brix={MINT_BRIX}>69,000 <span>$BRIX</span></Usd> + <Usd bnb={MINT_FEE}>0.0069 <span className="bnb">BNB</span></Usd>
          </div>
          <div className="mp-split">{t.mintSplit}</div>
        </div>

        {/* quantity */}
        <div className="qty">
          <div className="mp-label">{t.mintHowMany}</div>
          <div className="qty-row">
            <button className="qty-btn" onClick={() => setCount(Math.max(1, n - 1))} disabled={n <= 1} aria-label="-">−</button>
            <input
              className="qty-input" inputMode="numeric" value={n}
              onChange={(e) => setCount(Number(e.target.value.replace(/\D/g, "")) || 1)}
            />
            <button className="qty-btn" onClick={() => setCount(Math.min(max, n + 1))} disabled={n >= max} aria-label="+">+</button>
          </div>
          {w.address && <div className="qty-note">{walletLeft > 0 ? t.mintLeft(walletLeft) : t.mintSoldOutWallet}</div>}
        </div>

        {/* total */}
        <div className="mint-total">
          <div className="mp-label">{t.mintTotal}</div>
          <div className="mt-value"><Usd brix={needBrix}>{fmtBrix(needBrix)} <span>$BRIX</span></Usd></div>
          <div className="mt-value">+ <Usd bnb={needBnb}>{fmtBnb(needBnb)} <span className="bnb">BNB</span></Usd></div>
          {w.address && (
            <div className="mt-balance">
              {t.balance}: <b className={lowBrix ? "low" : ""}>{w.brix !== undefined ? <Usd brix={w.brix}>{fmtBrix(w.brix)} $BRIX</Usd> : "— $BRIX"}</b>
              {" · "}<b className={lowBnb ? "low" : ""}>{w.bnb !== undefined ? <Usd bnb={w.bnb}>{fmtBnb(w.bnb)} BNB</Usd> : "— BNB"}</b>
            </div>
          )}
        </div>

        {/* recipient: always the signer, on Robinhood Chain */}
        <div className="mint-to">
          {w.address && <div>{t.mintArrives} <b>{short(w.address)}</b>, {t.mintArrivesAfter}</div>}
          <div className="qty-note">{t.mintSameWhy}</div>
        </div>

        {/* action */}
        <div className="mint-action">
          <WalletGate>
            {max === 0 ? null
              : lowBrix ? (
                <>
                  <button className="act-btn" disabled>{t.notEnoughBrix}</button>
                  {NET.flap && <a className="link-btn" href={NET.flap} target="_blank" rel="noopener noreferrer">{t.getBrix}</a>}
                </>
              ) : lowBnb ? <button className="act-btn" disabled>{t.notEnoughBnb}</button>
              : needsApprove ? (
                <>
                  <button className="act-btn" disabled={busy} onClick={approve}>{t.mintApprove(fmtBrix(needBrix))}</button>
                  <div className="steps-note">{t.mintSteps}</div>
                </>
              ) : (
                <button className="act-btn act-go" disabled={busy} onClick={mint}>{t.mintButton(n)}</button>
              )}
          </WalletGate>
          <TxStatus state={tx.state} done={last === "approve" ? t.approved : t.mintDone}/>
        </div>
      </div>
    </Section>
  );
}
