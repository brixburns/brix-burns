"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey, some, transactionBuilder } from "@metaplex-foundation/umi";
import { setComputeUnitLimit, findAssociatedTokenPda, safeFetchToken } from "@metaplex-foundation/mpl-toolbox";

// @ts-ignore
import pkg from "@metaplex-foundation/mpl-core-candy-machine";
const { mintV1, mplCandyMachine, safeFetchCandyGuard, fetchCandyMachine, findMintCounterPda, safeFetchMintCounter } = pkg;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const RPC_ENDPOINT          = "https://devnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
const CANDY_MACHINE_ADDRESS = "FnMTiRXkaaDc3UmjFnWEE5GGouJ7imf2ABF6r4LVyr3X";
const COLLECTION_ADDRESS    = "FZYUd99aBvEj6tjDCJYYY7g3BaNYEY5P9uZDep6ERnLC";
const DESTINATION           = "CQ1vURtsg646tyLC4m1PutK82835CccYVjFkahrE5G6Z";
const BRIX_MINT             = "AYm3eo4dMoZ3DJ1bPGzQy6Pue4eUv8negmYK76sq93oS"; // fake $BRIX devnet
const BRIX_DECIMALS         = 0;    // ⚠️ deve combaciare con `02-create-candy-machine.js`
const BRIX_BURN_QTY         = 10;   // quantità "human" bruciata per mint (gruppo burn)
const MINT_PRICE            = 0.01;
const BURN_FEE              = 0.01; // SOL fee solo per gruppo "public"

// MAX_MINT conservativo a 5 per tutti i wallet.
// Motivo: Solflare droppa silenziosamente batch > 5. Phantom regge 10 su tx leggere ("public")
// ma su tx pesanti ("burn" con tokenBurn) abbiamo visto drop parziali (7/10). Cap uniforme = UX
// prevedibile, niente asimmetria fra gruppi, multi-sessione gestibile (50 NFT cap = 10 sessioni).
const MAX_MINT_PHANTOM      = 10;
const MAX_MINT_OTHER        = 5;
function maxMintFor(walletName?: string): number {
  return walletName === "Phantom" ? MAX_MINT_PHANTOM : MAX_MINT_OTHER;
}
// ─────────────────────────────────────────────────────────────────────────────

// Colori
const C_GREEN  = "#39ff14";
const C_GOLD   = "#f5c400";
const C_ORANGE = "#ff7a00";

type MintState = "idle" | "minting" | "success" | "partial" | "error";

function parseError(msg: string, group?: "burn" | "public"): string {
  const m = msg.toLowerCase();
  // Check our own thrown errors FIRST — alcuni contengono "mint limit" come substring
  if (m.includes("wallet may have dropped"))
    return "No NFTs minted — the wallet did not process the batch. Try again with fewer transactions.";
  if (m.includes("no nfts minted") || m.includes("bot tax may have fired"))
    return "No NFTs minted — check your remaining quota or SOL balance.";
  if (m.includes("mintlimitreached") || m.includes("mint limit"))
    return "Mint limit reached for this wallet.";
  // Pre-flight $BRIX: ATA mancante o supply insufficiente
  if (m.includes("brixatamissing") ||
      (group === "burn" && (m.includes("tokenaccount") || m.includes("account does not exist") || m.includes("invalid account data"))))
    return "$BRIX token account missing — receive $BRIX first to create your token account.";
  if (m.includes("insufficientbrix")) {
    const match = msg.match(/need=(\d+):have=(\d+)/);
    if (match) return `Insufficient $BRIX: need ${match[1]} but you have ${match[2]}.`;
    return "Insufficient $BRIX balance.";
  }
  if (
    m.includes("notenoughsol") ||
    m.includes("insufficient lamports") ||
    m.includes("insufficient funds") ||
    m.includes("not enough sol") ||
    m.includes("0x1") ||
    m.includes("transfer: insufficient")
  )
    return group === "burn"
      ? "Insufficient SOL or $BRIX balance — check both."
      : "Insufficient SOL balance.";
  if (m.includes("candymachineempty") || m.includes("candy machine empty"))
    return "Sold out — no NFTs remaining.";
  if (m.includes("mintnotlive") || m.includes("mint not live") || m.includes("before start date") || m.includes("0x1780c") || m.includes("notlive"))
    return "Minting has not started yet.";
  if (m.includes("mintended") || m.includes("after end date"))
    return "Minting phase has ended.";
  if (m.includes("user rejected") || m.includes("transaction cancelled") || m.includes("rejected the request"))
    return "Transaction cancelled.";
  if (m.includes("not been authorized") || m.includes("4100"))
    return "Wallet session error — disconnect, reconnect, and try again.";
  if (m.includes("simulation failed"))
    return group === "burn"
      ? "Transaction simulation failed — check SOL and $BRIX balance, plus your $BRIX token account exists."
      : "Transaction simulation failed — check your SOL balance and try again.";
  return `Transaction failed: ${msg.slice(0, 120)}`;
}

// Query Helius DAS (stessa API che Phantom usa per mostrare gli NFT del wallet).
// È indicizzata server-side e molto più affidabile di getAccount raw per asset
// appena creati. Ritorna gli ID degli asset della collection posseduti dal wallet.
async function fetchOwnedInCollection(walletAddress: string, timeoutMs = 8000): Promise<string[]> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "das",
        method: "getAssetsByOwner",
        params: { ownerAddress: walletAddress, page: 1, limit: 1000 },
      }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const data = await response.json();
    const items: Array<{ id: string; grouping?: Array<{ group_key: string; group_value: string }> }> =
      data?.result?.items ?? [];
    return items
      .filter(item =>
        item?.grouping?.some(g => g?.group_key === "collection" && g?.group_value === COLLECTION_ADDRESS)
      )
      .map(item => item.id);
  } catch {
    return [];
  }
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function QtyInput({ qty, setQty, maxMint }: { qty: number; setQty: (n: number) => void; maxMint: number }) {
  const clamp = (n: number) => Math.min(maxMint, Math.max(1, n));
  const btnStyle: React.CSSProperties = {
    width: "28px", height: "28px",
    background: "transparent", border: `1px solid ${C_GREEN}`,
    color: C_GREEN, fontFamily: "var(--font-mono)",
    fontSize: ".9rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, lineHeight: 1,
  };
  return (
    <>
      {/* nasconde la rotella nativa del browser sull'input number */}
      <style>{`
        .qty-no-spin::-webkit-inner-spin-button,
        .qty-no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        border: `1px solid ${C_GREEN}`, padding: "8px 12px",
        background: "rgba(57,255,20,.04)",
      }}>
        <span style={{
          color: C_GREEN, fontFamily: "var(--font-mono)",
          fontSize: ".6rem", letterSpacing: ".12em", marginRight: "4px",
        }}>
          QTY
        </span>
        <button style={btnStyle} onClick={() => setQty(clamp(qty - 1))}>−</button>
        <input
          className="qty-no-spin"
          type="number" min={1} max={maxMint} value={qty}
          onChange={e => setQty(clamp(parseInt(e.target.value) || 1))}
          style={{
            width: "36px", background: "transparent", border: "none",
            color: C_GREEN, fontFamily: "var(--font-mono)", fontSize: ".8rem",
            textAlign: "center", outline: "none", appearance: "textfield",
            MozAppearance: "textfield",
          } as React.CSSProperties}
        />
        <button style={btnStyle} onClick={() => setQty(clamp(qty + 1))}>+</button>
        <span style={{
          color: "#2a4a1a", fontFamily: "var(--font-mono)",
          fontSize: ".55rem", marginLeft: "4px",
        }}>
          / {maxMint}
        </span>
      </div>
    </>
  );
}

export default function MintButton() {
  const wallet         = useWallet();
  const { setVisible } = useWalletModal();

  const [state,          setState]          = useState<MintState>("idle");
  const [group,          setGroup]          = useState<string>("");
  const [qty,            setQty]            = useState<number>(1);
  const [progress,       setProgress]       = useState<string>("");
  const [assetList,      setAssetList]      = useState<string[]>([]);
  const [mintedCount,    setMintedCount]    = useState<number>(0);
  const [partialReason,  setPartialReason]  = useState<"sold_out" | "mint_limit" | null>(null);
  const [botTaxedCount,  setBotTaxedCount]  = useState<number>(0);
  const [errMsg,         setErrMsg]         = useState("");

  // MAX_MINT dinamico in base al wallet connesso (Solflare droppa batch > 5)
  const walletName = wallet.wallet?.adapter?.name;
  const maxMint    = maxMintFor(walletName);

  useEffect(() => {
    if (!wallet.connected) {
      setState("idle"); setGroup(""); setQty(1);
      setProgress(""); setAssetList([]); setMintedCount(0); setPartialReason(null); setBotTaxedCount(0); setErrMsg("");
    }
  }, [wallet.connected]);

  useEffect(() => {
    setState("idle"); setGroup(""); setQty(1);
    setProgress(""); setAssetList([]); setMintedCount(0); setPartialReason(null); setBotTaxedCount(0); setErrMsg("");
  }, [wallet.publicKey?.toString()]);

  // Riduce qty se il wallet appena connesso ha un limite più basso del valore corrente
  useEffect(() => {
    setQty(q => Math.min(q, maxMint));
  }, [maxMint]);

  const handleMint = useCallback(async (selectedGroup: "burn" | "public") => {
    if (!wallet.connected || !wallet.publicKey) { setVisible(true); return; }

    setState("minting");
    setGroup(selectedGroup);
    setProgress("…");
    setErrMsg("");
    setAssetList([]);
    setBotTaxedCount(0);

    try {
      const umi = createUmi(RPC_ENDPOINT)
        .use(mplCore())
        .use(mplCandyMachine())
        .use(walletAdapterIdentity(wallet));

      const cm         = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
      const candyGuard = await safeFetchCandyGuard(umi, cm.mintAuthority);

      // Pre-flight: CM esaurita (al momento del fetch). Bloccare prima di firmare evita
      // la situazione "5 tx tutte botTax con messaggio sold-out". Il caso parziale
      // (es. richiesta 5, CM ha 2 disponibili) passa: alcune mintano, altre fanno race.
      if (Number(cm.itemsRedeemed) >= Number(cm.data.itemsAvailable)) {
        throw new Error("CandyMachineEmpty");
      }

      // Pre-flight: mintLimit cap del wallet (al momento del fetch). Blocca solo se
      // count >= limit (= wallet COMPLETAMENTE al cap). Il caso parziale (count + qty > limit
      // ma count < limit) passa: alcune mintano davvero, altre tax è inevitabile.
      if (candyGuard && findMintCounterPda && safeFetchMintCounter) {
        const limitGuard = candyGuard?.guards?.mintLimit;
        const limit = limitGuard?.__option === "Some" ? Number(limitGuard.value.limit) : null;
        if (limit !== null) {
          try {
            const counterPda = findMintCounterPda(umi, {
              id:           1,
              user:         umi.identity.publicKey,
              candyGuard:   candyGuard.publicKey,
              candyMachine: cm.publicKey,
            });
            const counter = await safeFetchMintCounter(umi, counterPda);
            const count   = counter ? Number(counter.count) : 0;
            if (count >= limit) {
              throw new Error("MintLimitReached");
            }
          } catch (e) {
            // Solo "MintLimitReached" deve propagare. Errori di fetch del counter li ignoriamo
            // (best-effort: meglio passare e farsi bloccare on-chain che fallire pre-flight per RPC).
            if (e instanceof Error && e.message === "MintLimitReached") throw e;
          }
        }
      }

      // Pre-flight: finestra di minting
      const now = Date.now();
      const startGuard = candyGuard?.guards?.startDate;
      const endGuard   = candyGuard?.guards?.endDate;
      if (startGuard?.__option === "Some" && now < Number(startGuard.value.date) * 1000)
        throw new Error("MintNotLive");
      if (endGuard?.__option === "Some" && now > Number(endGuard.value.date) * 1000)
        throw new Error("MintEnded");

      // Pre-flight: balance — controlla prima di costruire le tx
      // così distinguiamo "sol insufficienti" da "mint limit raggiunto"
      const balance = await umi.rpc.getBalance(umi.identity.publicKey);
      // Gruppo "burn": solo MINT_PRICE in SOL (la fee è in $BRIX).
      // Gruppo "public": MINT_PRICE + BURN_FEE in SOL.
      const solPerMint = selectedGroup === "burn" ? MINT_PRICE : MINT_PRICE + BURN_FEE;
      const requiredLamports = BigInt(
        Math.ceil(solPerMint * qty * 1.1 * 1e9) // +10% buffer per tx fees / rent
      );
      if (balance.basisPoints < requiredLamports) {
        throw new Error("NotEnoughSOL");
      }

      // Pre-flight $BRIX balance: solo gruppo "burn" — verifica ATA esistente e supply sufficiente.
      // Eviamo di far firmare al wallet tx che falliranno per botTax (ATA mancante o balance basso).
      if (selectedGroup === "burn") {
        const ata = findAssociatedTokenPda(umi, {
          mint:  publicKey(BRIX_MINT),
          owner: umi.identity.publicKey,
        });
        const tokenAccount = await safeFetchToken(umi, ata);
        if (!tokenAccount) {
          throw new Error("BrixAtaMissing");
        }
        const needRaw = BigInt(BRIX_BURN_QTY) * BigInt(qty) * BigInt(10) ** BigInt(BRIX_DECIMALS);
        if (tokenAccount.amount < needRaw) {
          const haveBrix = Number(tokenAccount.amount / BigInt(10) ** BigInt(BRIX_DECIMALS));
          const needBrix = BRIX_BURN_QTY * qty;
          throw new Error(`InsufficientBrix:need=${needBrix}:have=${haveBrix}`);
        }
      }

      // Snapshot degli NFT della collection già posseduti dal wallet (per delta)
      const ownedBefore  = await fetchOwnedInCollection(wallet.publicKey!.toString());
      const beforeSet    = new Set(ownedBefore);

      const mintArgs = selectedGroup === "burn"
        ? {
            // tokenBurn: l'ATA del wallet viene derivata automaticamente dal mint.
            tokenBurn:  some({ mint: publicKey(BRIX_MINT) }),
            solPayment: some({ destination: publicKey(DESTINATION) }),
            mintLimit:  some({ id: 1 }),
          }
        : {
            solFixedFee: some({ destination: publicKey(DESTINATION) }),
            solPayment:  some({ destination: publicKey(DESTINATION) }),
            mintLimit:   some({ id: 1 }),
          };

      const assetSigners = Array.from({ length: qty }, () => generateSigner(umi));

      const builders = assetSigners.map(assetSigner =>
        transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 400_000 }))
          .add(mintV1(umi, {
            candyMachine: cm.publicKey,
            asset:        assetSigner,
            collection:   publicKey(COLLECTION_ADDRESS),
            candyGuard:   candyGuard?.publicKey,
            group:        selectedGroup,
            mintArgs,
          }))
      );

      setProgress("building");
      // Blockhash fresco per ogni tx (in parallelo): evita scadenze su sessioni lunghe
      // e garantisce finestre di validità indipendenti per ciascuna transazione
      const blockhashes = await Promise.all(
        Array.from({ length: qty }, () => umi.rpc.getLatestBlockhash())
      );
      const builtTxs = await Promise.all(
        builders.map((b, i) => b.setBlockhash(blockhashes[i]).build(umi))
      );

      let partialSigned = builtTxs;
      for (let i = 0; i < assetSigners.length; i++) {
        partialSigned[i] = await assetSigners[i].signTransaction(partialSigned[i]);
      }

      setProgress("sign");
      let signedTxs: typeof partialSigned;
      try {
        signedTxs = await umi.identity.signAllTransactions(partialSigned);
      } catch (e: unknown) {
        const eMsg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        // Phantom error 4100: session not authorized for batch signing — fall back to one-by-one
        if (eMsg.includes("not been authorized") || eMsg.includes("4100")) {
          signedTxs = [];
          for (let i = 0; i < partialSigned.length; i++) {
            setProgress(`sign ${i + 1}/${qty}`);
            signedTxs.push(await umi.identity.signTransaction(partialSigned[i]));
          }
        } else {
          throw e;
        }
      }

      let sentCount = 0;

      for (let i = 0; i < signedTxs.length; i++) {
        setProgress(`${i + 1}/${qty}`);
        let confirmed = false;
        try {
          const sig = await umi.rpc.sendTransaction(signedTxs[i]);
          sentCount++;
          try {
            await umi.rpc.confirmTransaction(sig, {
              strategy: { type: "blockhash", ...blockhashes[i] },
            });
            confirmed = true;
          } catch { /* confirm fallito — verifica successiva via asset address */ }
        } catch { /* send fallito */ }
        if (i < signedTxs.length - 1)
          await new Promise(r => setTimeout(r, confirmed ? 600 : 1500));
      }

      // Verifica via Helius DAS (getAssetsByOwner): stessa API che Phantom usa per
      // mostrare gli NFT. È indicizzata server-side ed è più affidabile del polling
      // su singoli account quando questi sono freschi (getAccount va spesso in stale).
      setProgress("verifying");
      await new Promise(r => setTimeout(r, 2000));

      let mintedAddresses: string[] = [];
      const TIMEOUT_MS    = Math.max(20000, sentCount * 5000);
      const POLL_MS       = 2500;
      const startVerify   = Date.now();
      let stableCount     = 0;
      let prevCount       = -1;

      while (Date.now() - startVerify < TIMEOUT_MS && mintedAddresses.length < sentCount) {
        const ownedNow = await fetchOwnedInCollection(wallet.publicKey!.toString());
        mintedAddresses = ownedNow.filter(addr => !beforeSet.has(addr));

        if (mintedAddresses.length >= sentCount) break;
        // Early exit per stato parziale stabile (es. 2/5 con 3 botTax) — NON quando count=0
        if (mintedAddresses.length > 0 && mintedAddresses.length === prevCount) {
          if (++stableCount >= 2) break;
        } else {
          stableCount = 0;
        }
        prevCount = mintedAddresses.length;

        if (mintedAddresses.length < sentCount)
          await new Promise(r => setTimeout(r, POLL_MS));
      }

      const actualMinted = mintedAddresses.length;
      const missing = sentCount - actualMinted;

      // Determina la causa di eventuali fallimenti:
      //   sold_out : CM esaurita (verificabile da itemsRedeemed) → botTax fired
      //   mint_limit: wallet ha raggiunto il cap (verificabile da mintCounter PDA) → botTax fired
      //   null      : drop silenzioso del wallet/RPC, NESSUN botTax pagato
      let failureReason: "sold_out" | "mint_limit" | null = null;
      if (actualMinted < sentCount) {
        const cmAfter = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
        if (Number(cmAfter.itemsRedeemed) >= Number(cmAfter.data.itemsAvailable)) {
          failureReason = "sold_out";
        } else {
          // Verifica mintCounter: se countOnChain + missing > limit → era mint_limit (botTax fired).
          // Altrimenti → drop RPC/wallet, niente botTax, messaggio neutro.
          try {
            const limitGuard = candyGuard?.guards?.mintLimit;
            const limit = limitGuard?.__option === "Some" ? Number(limitGuard.value.limit) : null;
            if (limit !== null && findMintCounterPda && safeFetchMintCounter) {
              const counterPda = findMintCounterPda(umi, {
                id:           1,
                user:         umi.identity.publicKey,
                candyGuard:   candyGuard.publicKey,
                candyMachine: cm.publicKey,
              });
              const counter = await safeFetchMintCounter(umi, counterPda);
              const count   = counter ? Number(counter.count) : 0;
              if (count + missing > limit) {
                failureReason = "mint_limit";
              }
              // else: count + missing <= limit → wallet aveva spazio, missing = drop RPC, no botTax
            }
          } catch { /* mintCounter check fallito — lasciamo failureReason null (neutro) */ }
        }
      }

      // botTax conta solo se la causa è confermata (sold_out o mint_limit).
      // Drop RPC non comporta botTax — il messaggio "X transactions fired bot-tax" sarebbe falso.
      const isBotTaxCause = failureReason === "sold_out" || failureReason === "mint_limit";
      setBotTaxedCount(isBotTaxCause ? missing : 0);

      if (actualMinted === 0) {
        if (failureReason === "sold_out") throw new Error("CandyMachineEmpty");
        if (failureReason === "mint_limit") throw new Error("MintLimitReached");
        // Default per 0 mintati senza ragione chiara: probabile drop del wallet (es. Solflare batch limit)
        throw new Error("No NFTs minted. The wallet may have dropped the batch — try again with fewer.");
      }

      setMintedCount(actualMinted);
      setAssetList(mintedAddresses);
      setPartialReason(actualMinted < qty ? failureReason : null);
      setState(actualMinted < qty ? "partial" : "success");

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrMsg(parseError(raw, selectedGroup));
      setState("error");
    }
  }, [wallet, setVisible, qty]);

  const reset = useCallback(() => {
    setState("idle"); setGroup("");
    setProgress(""); setAssetList([]); setMintedCount(0); setPartialReason(null); setBotTaxedCount(0); setErrMsg("");
  }, []);

  // ── Non connesso ─────────────────────────────────────────────────────────────
  if (!wallet.connected) {
    return (
      <button className="btn-connect-glow" onClick={() => setVisible(true)}>
        CONNECT WALLET
      </button>
    );
  }

  // Display label: il group on-chain è "public" ma in UI mostriamo "SOL" (allineato a docs/Alternative path)
  const groupLabel = group === "public" ? "SOL" : group.toUpperCase();

  // ── Minting ──────────────────────────────────────────────────────────────────
  if (state === "minting") {
    const label =
      progress === "building" ? "PREPARING..." :
      progress === "sign"     ? "AWAITING SIGNATURE..." :
      `MINTING [${groupLabel}] ${progress}`;
    return (
      <button className="btn-connect-glow" disabled>
        {label}
      </button>
    );
  }

  // ── Successo (totale o parziale) ──────────────────────────────────────────────
  if (state === "success" || state === "partial") {
    // mintedCount è la fonte di verità (da itemsRedeemed on-chain)
    // assetList può avere meno elementi se alcune confirm hanno fatto 429 ma le tx sono atterrate
    const count     = mintedCount || assetList.length;
    const isPartial = state === "partial";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{
          border: `1px solid ${isPartial ? C_ORANGE : C_GREEN}`,
          padding: "10px 14px", fontSize: ".65rem",
          color: isPartial ? C_ORANGE : C_GREEN,
          fontFamily: "var(--font-mono)", lineHeight: 1.7,
        }}>
          {isPartial
            ? `⚠️ ${count}/${qty} MINTED [${groupLabel}]`
            : `✅ ${count > 1 ? `${count}× ` : ""}MINT OK [${groupLabel}]`}
          {isPartial && (
            <div style={{ color: "#888870", fontSize: ".6rem", marginTop: "2px" }}>
              {qty - count} transaction{qty - count > 1 ? "s" : ""} failed.
            </div>
          )}
          {assetList.slice(0, 3).map((addr, i) => (
            <div key={addr} style={{ color: "#888870", marginTop: "4px" }}>
              <a
                href={`https://explorer.solana.com/address/${addr}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: C_GOLD, textDecoration: "none" }}
              >
                → #{i + 1} {addr.slice(0, 8)}…{addr.slice(-6)} ›
              </a>
            </div>
          ))}
          {assetList.length > 3 && (
            <div style={{ color: "#555540", marginTop: "2px", fontSize: ".6rem" }}>
              +{assetList.length - 3} more
            </div>
          )}
        </div>
        <button className="btn-connect-glow" onClick={reset} style={{ fontSize: ".7rem" }}>
          MINT MORE
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
          {botTaxedCount > 0 && (
            <div style={{ color: "#888870", fontSize: ".6rem", marginTop: "4px" }}>
              {botTaxedCount} transaction{botTaxedCount > 1 ? "s" : ""} fired bot-tax.
            </div>
          )}
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

  // ── Wallet connesso — scelta quantità + gruppo ────────────────────────────────
  const publicTotalSol = ((MINT_PRICE + BURN_FEE) * qty).toFixed(2);
  const burnTotalSol   = (MINT_PRICE * qty).toFixed(2);
  const burnTotalBrix  = BRIX_BURN_QTY * qty;

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

      <QtyInput qty={qty} setQty={setQty} maxMint={maxMint} />

      <div style={{
        fontSize: ".6rem", color: "#888870", fontFamily: "var(--font-mono)",
        letterSpacing: ".1em", textAlign: "center", padding: "4px 0",
      }}>
        CHOOSE ACCESS METHOD
      </div>

      {/* BURN — orange */}
      <button
        onClick={() => handleMint("burn")}
        style={{
          width: "100%", padding: "12px 14px",
          background: "transparent", border: `1px solid ${C_ORANGE}`, color: C_ORANGE,
          fontFamily: "var(--font-mono)", fontSize: ".72rem",
          cursor: "pointer", letterSpacing: ".08em",
          transition: "background .2s, box-shadow .2s", textAlign: "left", lineHeight: 1.6,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,122,0,.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 12px rgba(255,122,0,.3)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
        }}
      >
        <div style={{ fontWeight: "bold" }}>🔥 BURN ACCESS</div>
        <div style={{ fontSize: ".62rem", color: "#888870", marginTop: "2px" }}>
          {qty > 1
            ? `${qty} × (${BRIX_BURN_QTY} $BRIX + ${MINT_PRICE} SOL) = ${burnTotalBrix} $BRIX + ${burnTotalSol} SOL`
            : `${BRIX_BURN_QTY} $BRIX burned + ${MINT_PRICE} SOL mint`}
        </div>
      </button>

      {/* PUBLIC — gold */}
      <button
        onClick={() => handleMint("public")}
        style={{
          width: "100%", padding: "12px 14px",
          background: "transparent", border: `1px solid ${C_GOLD}`, color: C_GOLD,
          fontFamily: "var(--font-mono)", fontSize: ".72rem",
          cursor: "pointer", letterSpacing: ".08em",
          transition: "background .2s, box-shadow .2s", textAlign: "left", lineHeight: 1.6,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,196,0,.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 12px rgba(245,196,0,.3)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
        }}
      >
        <div style={{ fontWeight: "bold" }}>◎ SOL ACCESS</div>
        <div style={{ fontSize: ".62rem", color: "#888870", marginTop: "2px" }}>
          {qty > 1
            ? `${qty} × (${BURN_FEE} fee + ${MINT_PRICE}) = ${publicTotalSol} SOL`
            : `${BURN_FEE} SOL access fee + ${MINT_PRICE} SOL mint`}
        </div>
      </button>

    </div>
  );
}
