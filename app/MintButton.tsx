"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey, some, transactionBuilder } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

// @ts-ignore
import pkg from "@metaplex-foundation/mpl-core-candy-machine";
const { mintV1, mplCandyMachine, safeFetchCandyGuard, fetchCandyMachine } = pkg;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const RPC_ENDPOINT          = "https://api.devnet.solana.com";
const CANDY_MACHINE_ADDRESS = "9LKyj3KFupiEnPQ1WHrtFLn4YQTpwHNMTU887mRsvQoS";
const COLLECTION_ADDRESS    = "FZYUd99aBvEj6tjDCJYYY7g3BaNYEY5P9uZDep6ERnLC";
const DESTINATION           = "DjUQkZriYBD3wdpGdoKA6BtHdx75ZZHvNvA5vvhLj28m";
const INCENERITORE          = "1nc1nerator11111111111111111111111111111111";
// ─────────────────────────────────────────────────────────────────────────────

type MintState = "idle" | "minting" | "success" | "error";

// Messaggi di errore leggibili per l'utente
function parseError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("mintlimitreached") || m.includes("mint limit"))
    return "Mint limit reached — max 1 mint per wallet.";
  if (
    m.includes("notenoughsol") ||
    m.includes("insufficient lamports") ||
    m.includes("insufficient funds") ||
    m.includes("not enough sol") ||
    m.includes("0x1") ||
    m.includes("transfer: insufficient")
  )
    return "Insufficient SOL balance — you need at least 0.11 SOL to mint.";
  if (m.includes("candymachineempty") || m.includes("candy machine empty"))
    return "Sold out — no NFTs remaining.";
  if (m.includes("mintnotlive") || m.includes("mint not live") || m.includes("before start date") || m.includes("0x1780c") || m.includes("notlive"))
    return "Minting has not started yet.";
  if (m.includes("mintended") || m.includes("after end date"))
    return "Minting phase has ended.";
  if (m.includes("user rejected") || m.includes("transaction cancelled") || m.includes("rejected the request"))
    return "Transaction cancelled.";
  if (m.includes("simulation failed"))
    return "Transaction simulation failed — check your SOL balance and try again.";
  return `Transaction failed: ${msg.slice(0, 120)}`;
}

export default function MintButton() {
  const wallet         = useWallet();
  const { setVisible } = useWalletModal();

  const [state,  setState]  = useState<MintState>("idle");
  const [group,  setGroup]  = useState<string>("");
  const [asset,  setAsset]  = useState("");
  const [errMsg, setErrMsg] = useState("");

  // ── Fix punto 2: reset stato quando wallet si disconnette o cambia ──────────
  useEffect(() => {
    if (!wallet.connected) {
      setState("idle");
      setGroup("");
      setAsset("");
      setErrMsg("");
    }
  }, [wallet.connected]);

  // Reset anche quando cambia il publicKey (cambio account Phantom)
  useEffect(() => {
    setState("idle");
    setGroup("");
    setAsset("");
    setErrMsg("");
  }, [wallet.publicKey?.toString()]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleMint = useCallback(async (selectedGroup: "burn" | "public") => {
    if (!wallet.connected || !wallet.publicKey) { setVisible(true); return; }

    setState("minting");
    setGroup(selectedGroup);
    setErrMsg("");
    setAsset("");

    try {
      const umi = createUmi(RPC_ENDPOINT)
        .use(mplCore())
        .use(mplCandyMachine())
        .use(walletAdapterIdentity(wallet));

      // Fetch CM prima del mint — salviamo itemsRedeemed per verifica post-mint
      const candyMachineBefore = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
      const redeemedBefore     = Number(candyMachineBefore.itemsRedeemed);
      const candyGuard         = await safeFetchCandyGuard(umi, candyMachineBefore.mintAuthority);

      // ── Controllo startDate / endDate lato client ──────────────────────────
      // Evita di inviare la tx (e pagare botTax) se la CM è fuori finestra
      const now = Date.now();
      const startDate = candyGuard?.guards?.startDate ?? null;
      const endDate   = candyGuard?.guards?.endDate   ?? null;

      if (startDate?.__option === "Some") {
        const startMs = Number(startDate.value.date) * 1000;
        if (now < startMs) throw new Error("MintNotLive");
      }
      if (endDate?.__option === "Some") {
        const endMs = Number(endDate.value.date) * 1000;
        if (now > endMs) throw new Error("MintEnded");
      }
      // ────────────────────────────────────────────────────────────────────────

      const mintArgs = selectedGroup === "burn"
        ? {
            solFixedFee: some({ destination: publicKey(INCENERITORE) }),
            solPayment:  some({ destination: publicKey(DESTINATION)  }),
            mintLimit:   some({ id: 1 }),
          }
        : {
            solFixedFee: some({ destination: publicKey(DESTINATION) }),
            solPayment:  some({ destination: publicKey(DESTINATION) }),
            mintLimit:   some({ id: 1 }),
          };

      const assetSigner = generateSigner(umi);

      await transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 400_000 }))
        .add(
          mintV1(umi, {
            candyMachine: candyMachineBefore.publicKey,
            asset:        assetSigner,
            collection:   publicKey(COLLECTION_ADDRESS),
            candyGuard:   candyGuard?.publicKey,
            group:        selectedGroup,
            mintArgs,
          })
        )
        .sendAndConfirm(umi);

      // ── Fix punto 1: verifica reale del mint via itemsRedeemed ──────────────
      // BotTax fa sembrare la tx confermata anche in caso di errore guard.
      // Se itemsRedeemed non è aumentato, il mint non è avvenuto davvero.
      const candyMachineAfter = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
      const redeemedAfter     = Number(candyMachineAfter.itemsRedeemed);

      if (redeemedAfter <= redeemedBefore) {
        // Tx confermata ma nessun NFT mintato → botTax scattata
        // Determiniamo il motivo più probabile
        if (redeemedBefore >= 1) {
          throw new Error("MintLimitReached");
        }
        if (Number(candyMachineAfter.itemsRedeemed) >= Number(candyMachineAfter.data.itemsAvailable)) {
          throw new Error("CandyMachineEmpty");
        }
        throw new Error("Transaction failed — bot tax charged. Check your eligibility.");
      }
      // ────────────────────────────────────────────────────────────────────────

      setAsset(assetSigner.publicKey.toString());
      setState("success");

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrMsg(parseError(raw));
      setState("error");
    }
  }, [wallet, setVisible]);

  const reset = useCallback(() => {
    setState("idle");
    setGroup("");
    setAsset("");
    setErrMsg("");
  }, []);

  // ── Non connesso ─────────────────────────────────────────────────────────────
  if (!wallet.connected) {
    return (
      <button className="btn-connect-glow" onClick={() => setVisible(true)}>
        CONNECT WALLET
      </button>
    );
  }

  // ── Minting ──────────────────────────────────────────────────────────────────
  if (state === "minting") {
    return (
      <button className="btn-connect-glow" disabled>
        MINTING [{group.toUpperCase()}]...
      </button>
    );
  }

  // ── Successo ─────────────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{
          border: "1px solid #39ff14", padding: "10px 14px",
          fontSize: ".65rem", color: "#39ff14",
          fontFamily: "var(--font-mono)", lineHeight: 1.7,
        }}>
          ✅ MINT OK [{group.toUpperCase()}]
          <div style={{ color: "#888870", marginTop: "4px", wordBreak: "break-all" }}>
            {asset.slice(0, 8)}...{asset.slice(-8)}
          </div>
          <a
            href={`https://explorer.solana.com/address/${asset}?cluster=devnet`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: "#f5c400", textDecoration: "none" }}
          >→ Explorer ›</a>
        </div>
        <button className="btn-connect-glow" onClick={reset} style={{ fontSize: ".7rem" }}>
          MINT ANOTHER
        </button>
        <button onClick={() => wallet.disconnect()} style={{
          background: "transparent", border: "1px solid #2a2a00",
          color: "#888870", fontFamily: "var(--font-mono)",
          fontSize: ".6rem", padding: "6px", cursor: "pointer",
        }}>DISCONNECT</button>
      </div>
    );
  }

  // ── Errore ───────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{
          border: "1px solid #ff3333", padding: "10px 14px",
          fontSize: ".68rem", color: "#ff3333",
          fontFamily: "var(--font-mono)", lineHeight: 1.7,
        }}>
          ❌ {errMsg}
        </div>
        <button className="btn-connect-glow" onClick={reset}>RETRY</button>
        <button onClick={() => wallet.disconnect()} style={{
          background: "transparent", border: "1px solid #2a2a00",
          color: "#888870", fontFamily: "var(--font-mono)",
          fontSize: ".6rem", padding: "6px", cursor: "pointer",
        }}>DISCONNECT</button>
      </div>
    );
  }

  // ── Wallet connesso — scelta gruppo ──────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

      <div style={{
        border: "1px solid #2a2a00", padding: "5px 10px",
        fontSize: ".58rem", color: "#888870", fontFamily: "var(--font-mono)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{wallet.publicKey!.toString().slice(0,6)}...{wallet.publicKey!.toString().slice(-6)}</span>
        <button onClick={() => wallet.disconnect()} style={{
          background: "transparent", border: "none",
          color: "#888870", cursor: "pointer",
          fontSize: ".58rem", fontFamily: "var(--font-mono)",
        }}>✕</button>
      </div>

      <div style={{
        fontSize: ".6rem", color: "#888870", fontFamily: "var(--font-mono)",
        letterSpacing: ".1em", textAlign: "center", padding: "4px 0",
      }}>
        CHOOSE ACCESS METHOD
      </div>

      <button
        onClick={() => handleMint("burn")}
        style={{
          width: "100%", padding: "12px 14px",
          background: "transparent", border: "1px solid #f5c400", color: "#f5c400",
          fontFamily: "var(--font-mono)", fontSize: ".72rem",
          cursor: "pointer", letterSpacing: ".08em",
          transition: "background .2s, box-shadow .2s", textAlign: "left", lineHeight: 1.6,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,196,0,.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "0 0 12px rgba(245,196,0,.3)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
        }}
      >
        <div style={{ fontWeight: "bold" }}>🔥 BURN ACCESS</div>
        <div style={{ fontSize: ".62rem", color: "#888870", marginTop: "2px" }}>
          0.01 SOL burned forever + 0.1 SOL mint
        </div>
      </button>

      <button
        onClick={() => handleMint("public")}
        style={{
          width: "100%", padding: "12px 14px",
          background: "transparent", border: "1px solid #39ff14", color: "#39ff14",
          fontFamily: "var(--font-mono)", fontSize: ".72rem",
          cursor: "pointer", letterSpacing: ".08em",
          transition: "background .2s, box-shadow .2s", textAlign: "left", lineHeight: 1.6,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(57,255,20,.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "0 0 12px rgba(57,255,20,.3)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
        }}
      >
        <div style={{ fontWeight: "bold" }}>⚡ PUBLIC ACCESS</div>
        <div style={{ fontSize: ".62rem", color: "#888870", marginTop: "2px" }}>
          0.01 SOL access fee + 0.1 SOL mint
        </div>
      </button>

    </div>
  );
}