"use client";

import { useLang } from "../lib/i18n";

// Final weights: BRIX VAULT/art/onchain/weights.json (in tenths: 50/22/14/10/0).
// Only the two ends are named, as on social and OpenSea (same in both languages).
const TIERS = [
  { name: "WIN BIG", count: 50, weight: "5.0" },
  { name: "", count: 150, weight: "2.2" },
  { name: "", count: 400, weight: "1.4" },
  { name: "", count: 1202, weight: "1.0" },
  { name: "EMPTY", count: 420, weight: "0" },
];

export default function How() {
  const { t } = useLang();
  const cards = [
    { n: "01", title: t.howFloorT, body: t.howFloorB },
    { n: "02", title: t.howMintT, body: t.howMintB },
    { n: "03", title: t.howRevealT, body: t.howRevealB },
    { n: "04", title: t.howCrackT, body: t.howCrackB },
  ];
  return (
    <section className="panel" id="how">
      <h2 className="panel-title">{t.howTitle}</h2>
      <div className="how-grid">
        {cards.map((c) => (
          <div className="how-card" key={c.n}>
            <div className="hc-n">{c.n}</div>
            <div className="hc-title">{c.title}</div>
            <p className="hc-body">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="tiers">
        <div className="mp-label">{t.tiersTitle}</div>
        <div className="tier-row">
          {TIERS.map((tier) => (
            <div className={`tier${tier.weight === "0" ? " empty" : ""}`} key={tier.weight}>
              {/* unnamed tiers keep the line, so all boxes stay the same height */}
              <div className="tier-n">{tier.name || " "}</div>
              <div className="tier-w">×{tier.weight}</div>
              <div className="tier-c">{tier.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
