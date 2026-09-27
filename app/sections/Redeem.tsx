"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { erc20Abi, vaultAbi } from "../lib/abi";
import { NET } from "../lib/chain";
import { fmtBnb, fmtBrix } from "../lib/format";
import { useLang } from "../lib/i18n";
import { Usd } from "../lib/prices";
import { BURN_ABOVE, fmtRatio, useFloorToPrice } from "../lib/ratio";
import type { VaultState } from "../lib/useVault";
import { useTx } from "../lib/useTx";
import BurnWithBnb from "./BurnWithBnb";
import { Section, TxStatus, useWallet, WalletGate } from "./shared";

const vault = NET.vault as `0x${string}`;

function parseBrix(s: string): bigint {
  try { return s ? parseUnits(s.replace(/,/g, ""), 18) : 0n; } catch { return 0n; }
}

/** The gauge fills toward the burn threshold and stops there. */
function RatioGauge({ ratio }: { ratio: number }) {
  const { t } = useLang();
  const fill = Math.min(ratio / BURN_ABOVE, 1) * 100;
  return (
    <div className="ratio">
      <div className="ratio-head">
        <span className="mp-label">{t.ratioLabel}</span>
        <span className={`ratio-value${ratio > BURN_ABOVE ? " over" : ""}`}>{fmtRatio(ratio)}</span>
      </div>
      <div className="ratio-track"><div className="ratio-fill" style={{ width: `${fill}%` }}/></div>
      <div className="qty-note">{t.ratioHint}</div>
    </div>
  );
}

export default function Redeem({ v }: { v?: VaultState }) {
  const { t } = useLang();
  // Burn or sell, right now: one number, FLOOR / PRICE, drives both the verdict and the gauge.
  const ratio = useFloorToPrice(v?.floor);
  const verdict = ratio === undefined ? undefined : ratio > BURN_ABOVE ? "burn" : "sell";
  const w = useWallet();
  const tx = useTx();
  const [input, setInput] = useState("");
  const [last, setLast] = useState<"approve" | "redeem">("redeem");

  const amount = parseBrix(input);
  const { data: preview } = useReadContract({
    address: vault, abi: vaultAbi, functionName: "previewRedeem", args: [amount],
    chainId: NET.chain.id, query: { enabled: amount > 0n, refetchInterval: 15_000 },
  });

  const tooMuch = w.brix !== undefined && amount > w.brix;
  const needsApprove = w.allowance !== undefined && w.allowance < amount;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  const approve = () => (setLast("approve"), tx.send({
    address: NET.token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [vault, amount],
  }));
  const redeem = async () => {
    setLast("redeem");
    if (await tx.send({ address: vault, abi: vaultAbi, functionName: "redeem", args: [amount] })) setInput("");
  };

  return (
    <Section id="redeem" title={t.redeemTitle} lead={t.redeemLead}>
      <div className="mint-card">
        {verdict && (
          <div className={`verdict verdict-${verdict}`}>{verdict === "burn" ? t.burnBetter : t.sellBetter}</div>
        )}
        {ratio !== undefined && <RatioGauge ratio={ratio}/>}
        <div className="qty">
          <label className="mp-label" htmlFor="redeem-amount">{t.redeemAmount}</label>
          <div className="amount-row">
            <input
              id="redeem-amount" className={`amount-input${tooMuch ? " bad" : ""}`} inputMode="decimal" placeholder="0"
              value={input} onChange={(e) => setInput(e.target.value.replace(/[^\d.]/g, ""))}
            />
            {w.brix !== undefined && (
              <button className="link-btn" onClick={() => setInput(formatUnits(w.brix!, 18))}>{t.redeemMax}</button>
            )}
          </div>
          {w.address && <div className="qty-note">{t.balance}: {w.brix !== undefined ? fmtBrix(w.brix) : "—"} $BRIX</div>}
        </div>

        <div className="mint-total">
          <div className="mp-label">{t.redeemGet}</div>
          <div className="mt-value bnb">
            {preview !== undefined && amount > 0n
              ? <Usd bnb={preview}>{fmtBnb(preview, 6)} <span className="bnb">BNB</span></Usd>
              : <>0 <span className="bnb">BNB</span></>}
          </div>
          <div className="qty-note">{t.redeemNote}</div>
        </div>

        <div className="mint-action">
          <WalletGate>
            {tooMuch ? <button className="act-btn" disabled>{t.notEnoughBrix}</button>
              : needsApprove ? <button className="act-btn" disabled={busy || amount === 0n} onClick={approve}>{t.redeemApprove}</button>
              : <button className="act-btn act-burn" disabled={busy || amount === 0n || !preview} onClick={redeem}>{t.redeemButton}</button>}
          </WalletGate>
          <TxStatus state={tx.state} done={last === "approve" ? t.approved : t.redeemDone}/>
        </div>

        {NET.burnWithBnb && <BurnWithBnb/>}
      </div>
    </Section>
  );
}
