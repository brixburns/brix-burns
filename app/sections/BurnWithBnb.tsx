"use client";

import { useState } from "react";
import { parseEther, parseUnits } from "viem";
import { vaultAbi } from "../lib/abi";
import { NET } from "../lib/chain";
import { fmtBnb, fmtBrix } from "../lib/format";
import { useLang } from "../lib/i18n";
import { usePrices, Usd } from "../lib/prices";
import { useTx } from "../lib/useTx";
import { TxStatus, useWallet, WalletGate } from "./shared";

const vault = NET.vault as `0x${string}`;

// The estimate uses the quoted price minus the 3% tax; the vault must get at
// least 90% of it, or the transaction reverts instead of buying at a bad price.
const TAX = 0.97;
const MIN_SHARE = 0.9;

function parseBnb(s: string): bigint {
  try { return s ? parseEther(s) : 0n; } catch { return 0n; }
}

/** burnWithBnb: BNB in, $BRIX bought and sent to 0x…dEaD. A small box inside the redeem panel. */
export default function BurnWithBnb() {
  const { t } = useLang();
  const w = useWallet();
  const tx = useTx();
  const { brixBnb } = usePrices();
  const [input, setInput] = useState("");

  const bnb = parseBnb(input);
  const expected = brixBnb && bnb > 0n ? (Number(bnb) / 1e18) * TAX / brixBnb : 0;
  const expectedWei = expected ? parseUnits(expected.toFixed(0), 18) : 0n;
  const minBrix = expected ? parseUnits((expected * MIN_SHARE).toFixed(0), 18) : 0n;
  const tooMuch = w.bnb !== undefined && bnb > w.bnb;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  const burn = async () => {
    if (await tx.send({ address: vault, abi: vaultAbi, functionName: "burnWithBnb", args: [minBrix], value: bnb })) setInput("");
  };

  return (
    <div className="bwb">
      <div className="bwb-title">{t.bwbTitle}</div>
      <p className="qty-note">{t.bwbLead}</p>
      <div className="bwb-row">
        <div className="bwb-field">
          <label className="mp-label" htmlFor="bwb-amount">{t.bwbAmount}</label>
          <input
            id="bwb-amount" className={`amount-input${tooMuch ? " bad" : ""}`} inputMode="decimal" placeholder="0"
            value={input} onChange={(e) => setInput(e.target.value.replace(/[^\d.]/g, ""))}
          />
          {w.bnb !== undefined && <div className="qty-note">{t.balance}: {fmtBnb(w.bnb)} BNB</div>}
        </div>
        <div className="bwb-field">
          <div className="mp-label">{t.bwbEstimate}</div>
          <div className="mt-value">{expectedWei ? <Usd brix={expectedWei}>{fmtBrix(expectedWei)}</Usd> : "0"}</div>
        </div>
      </div>
      <div className="mint-action">
        <WalletGate>
          {tooMuch ? <button className="act-btn" disabled>{t.notEnoughBnb}</button>
            : bnb > 0n && !brixBnb ? <button className="act-btn" disabled>{t.bwbNoPrice}</button>
            : <button className="act-btn act-burn" disabled={busy || bnb === 0n} onClick={burn}>{t.bwbButton}</button>}
        </WalletGate>
        <TxStatus state={tx.state} done={t.bwbDone}/>
      </div>
    </div>
  );
}
