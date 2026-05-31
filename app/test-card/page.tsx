"use client";

import ShareBurnCard from "../ShareBurnCard";

// Dati finti per testare la card
const MOCK_AMOUNT = 50_000;
const MOCK_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const MOCK_TX     = "5xQ3mNpLkJ9vR2cYbWdA8eHfT4nGqZoKs6uXiPmCwE1rV7jBtDyNhF0gMlOuSa";
const MOCK_CA     = "3BgwJ8b7b9hHX4sgfZ2KJhv9496CoVfsMK2YePevsBRw";
const MOCK_SUPPLY = 949_950_000; // supply simulata post-burn

export default function TestCardPage() {
  return (
    <div style={{
      minHeight:      "100vh",
      background:     "#0a0a0a",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "24px",
      padding:        "40px",
      fontFamily:     "monospace",
      color:          "#666",
    }}>
      <div style={{ fontSize: ".7rem", letterSpacing: ".2em" }}>// TEST — SHARE BURN CARD</div>

      <div style={{ width: "300px" }}>
        <ShareBurnCard
          amount={MOCK_AMOUNT}
          wallet={MOCK_WALLET}
          txSig={MOCK_TX}
          ca={MOCK_CA}
          supply={MOCK_SUPPLY}
        />
      </div>

      <div style={{ fontSize: ".6rem", letterSpacing: ".1em", color: "#444", textAlign: "center", maxWidth: "340px" }}>
        Clicca il bottone → scarica PNG in Downloads → apre Twitter pre-compilato.<br/>
        Modifica MOCK_AMOUNT / MOCK_WALLET / MOCK_TX per testare varianti.
      </div>
    </div>
  );
}
