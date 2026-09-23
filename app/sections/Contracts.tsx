"use client";

import { useState } from "react";
import { NET } from "../lib/chain";
import { useLang } from "../lib/i18n";

/** The only official addresses: the FAQ and the social posts point here. */
export default function Contracts() {
  const { t } = useLang();
  const [copied, setCopied] = useState("");

  const rows = [
    { label: t.contractToken, address: NET.token, chain: NET.chain },
    { label: t.contractVault, address: NET.vault, chain: NET.chain },
    { label: t.contractTrixster, address: NET.trixster, chain: NET.rhChain },
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
          {r.address ? (
            <span className="cr-addr">
              <a href={`${r.chain.blockExplorers?.default.url}/address/${r.address}`} target="_blank" rel="noopener noreferrer">{r.address}</a>
              <button className="copy-btn" onClick={() => copy(r.address)} aria-label={t.copy}>
                {copied === r.address ? "✓" : t.copy}
              </button>
            </span>
          ) : (
            <span className="cr-soon">{t.contractsSoon}</span>
          )}
        </div>
      ))}
    </div>
  );
}
