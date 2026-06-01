"use client";
/**
 * MintButtonF1a — Mainnet
 * Phase 1a (Early Access): allowList + tokenBurn 25k $BRIX (no SOL price).
 * mintLimit per wallet: 2.
 * Requires public/allowlist-proofs.json (merkle root + proofs for eligible wallets).
 */

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCore, safeFetchAssetV1 } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey, some, none, transactionBuilder } from "@metaplex-foundation/umi";
import { setComputeUnitLimit, findAssociatedTokenPda, safeFetchToken } from "@metaplex-foundation/mpl-toolbox";

// @ts-ignore
import pkg from "@metaplex-foundation/mpl-core-candy-machine";
const { mintV1, mplCandyMachine, safeFetchCandyGuard, fetchCandyMachine, findMintCounterPda, safeFetchMintCounter, route } = pkg;

// ─── MAINNET CONFIG ──────────────────────────────────────────────────────────
const RPC_ENDPOINT          = "https://mainnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
const CANDY_MACHINE_ADDRESS = "";
const COLLECTION_ADDRESS    = "";
const BRIX_MINT             = "";
const BRIX_DECIMALS         = 6;
const BRIX_BURN_QTY         = 25_000;
const ALLOWLIST_URL         = "/allowlist-proofs.json";
const MAX_MINT_PHANTOM      = 2;
const MAX_MINT_OTHER        = 2;
function maxMintFor(walletName?: string): number {
  return walletName === "Phantom" ? MAX_MINT_PHANTOM : MAX_MINT_OTHER;
}
// ─────────────────────────────────────────────────────────────────────────────

const C_GREEN  = "#39ff14";
const C_GOLD   = "#f5c400";
const C_ORANGE = "#ff7a00";

type MintState = "idle" | "minting" | "success" | "partial" | "error";

interface AllowlistData {
  candyMachine: string;
  merkleRoot:   string;
  proofs:       Record<string, string[]>;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function parseError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("notinallowlist"))                        return "Your wallet is not on the allowlist for this phase.";
  if (m.includes("allowedlistnotinitialized") ||
      m.includes("allowedlistnotfound") ||
      m.includes("invalidproof"))                          return "Allowlist verification failed — proof invalid.";
  if (m.includes("wallet may have dropped"))               return "No NFTs minted — wallet did not process the batch.";
  if (m.includes("no nfts minted"))                        return "No NFTs minted — check your remaining quota.";
  if (m.includes("mintlimitreached") || m.includes("mint limit"))
                                                            return "Mint limit reached for this wallet.";
  if (m.includes("brixatamissing") || m.includes("tokenaccount") ||
      m.includes("account does not exist"))                return "$BRIX token account missing — acquire $BRIX first.";
  if (m.includes("insufficientbrix")) {
    const match = msg.match(/need=(\d+):have=(\d+)/);
    if (match) return `Insufficient $BRIX: need ${match[1]} but you have ${match[2]}.`;
    return "Insufficient $BRIX balance.";
  }
  if (m.includes("insufficient lamports") || m.includes("insufficient funds") ||
      m.includes("notenoughsol"))                          return "Insufficient SOL for transaction fees.";
  if (m.includes("candymachineempty"))                     return "Sold out — no NFTs remaining.";
  if (m.includes("mintnotlive") || m.includes("before start date"))
                                                            return "Minting has not started yet.";
  if (m.includes("mintended") || m.includes("after end date"))
                                                            return "Phase F1a has ended.";
  if (m.includes("user rejected") || m.includes("rejected the request") ||
      m.includes("not been authorized") || m.includes("4100"))
                                                            return "Transaction cancelled.";
  if (m.includes("wallet session") || m.includes("wallet disconnected"))
                                                            return "Wallet session error — reconnect and try again.";
  return `Transaction failed: ${msg.slice(0, 120)}`;
}

async function fetchOwnedInCollection(walletAddress: string): Promise<string[]> {
  try {
    const response = await fetch(RPC_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "das", method: "getAssetsByOwner",
        params: { ownerAddress: walletAddress, page: 1, limit: 1000 },
      }),
    });
    const data = await response.json();
    const items: Array<{ id: string; grouping?: Array<{ group_key: string; group_value: string }> }> =
      data?.result?.items ?? [];
    return items
      .filter(it => it?.grouping?.some(g => g?.group_key === "collection" && g?.group_value === COLLECTION_ADDRESS))
      .map(it => it.id);
  } catch { return []; }
}

function QtyInput({ qty, setQty, maxMint }: { qty: number; setQty: (n: number) => void; maxMint: number }) {
  const clamp = (n: number) => Math.min(maxMint, Math.max(1, n));
  const btnStyle: React.CSSProperties = {
    width: "28px", height: "28px", background: "transparent", border: `1px solid ${C_GREEN}`,
    color: C_GREEN, fontFamily: "var(--font-mono)", fontSize: ".9rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1,
  };
  return (
    <>
      <style>{`.qty-no-spin::-webkit-inner-spin-button,.qty-no-spin::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        border: `1px solid ${C_GREEN}`, padding: "8px 12px", background: "rgba(57,255,20,.04)",
      }}>
        <span style={{ color: C_GREEN, fontFamily: "var(--font-mono)", fontSize: ".6rem", letterSpacing: ".12em", marginRight: "4px" }}>QTY</span>
        <button style={btnStyle} onClick={() => setQty(clamp(qty - 1))}>−</button>
        <input className="qty-no-spin" type="number" min={1} max={maxMint} value={qty}
          onChange={e => setQty(clamp(parseInt(e.target.value) || 1))}
          style={{ width: "36px", background: "transparent", border: "none",
            color: C_GREEN, fontFamily: "var(--font-mono)", fontSize: ".8rem",
            textAlign: "center", outline: "none", appearance: "textfield", MozAppearance: "textfield" } as React.CSSProperties} />
        <button style={btnStyle} onClick={() => setQty(clamp(qty + 1))}>+</button>
        <span style={{ color: "#2a4a1a", fontFamily: "var(--font-mono)", fontSize: ".55rem", marginLeft: "4px" }}>/ {maxMint}</span>
      </div>
    </>
  );
}

export default function MintButtonF1a() {
  const wallet         = useWallet();
  const { setVisible } = useWalletModal();

  const [state,          setState]          = useState<MintState>("idle");
  const [qty,            setQty]            = useState<number>(1);
  const [progress,       setProgress]       = useState<string>("");
  const [assetList,      setAssetList]      = useState<string[]>([]);
  const [mintedCount,    setMintedCount]    = useState<number>(0);
  const [botTaxedCount,  setBotTaxedCount]  = useState<number>(0);
  const [errMsg,         setErrMsg]         = useState("");
  const [allowlistData,  setAllowlistData]  = useState<AllowlistData | null>(null);
  const [allowlistOk,    setAllowlistOk]    = useState<boolean | null>(null);

  const walletName = wallet.wallet?.adapter?.name;
  const maxMint    = maxMintFor(walletName);

  useEffect(() => {
    fetch(ALLOWLIST_URL).then(r => r.json()).then(setAllowlistData).catch(() => setAllowlistData(null));
  }, []);

  useEffect(() => {
    if (!wallet.publicKey || !allowlistData) { setAllowlistOk(null); return; }
    setAllowlistOk(Boolean(allowlistData.proofs[wallet.publicKey.toString()]));
  }, [wallet.publicKey, allowlistData]);

  useEffect(() => {
    if (!wallet.connected) { setState("idle"); setQty(1); setProgress(""); setAssetList([]); setMintedCount(0); setBotTaxedCount(0); setErrMsg(""); }
  }, [wallet.connected]);

  useEffect(() => {
    setState("idle"); setQty(1); setProgress(""); setAssetList([]); setMintedCount(0); setBotTaxedCount(0); setErrMsg("");
  }, [wallet.publicKey?.toString()]);

  useEffect(() => { setQty(q => Math.min(q, maxMint)); }, [maxMint]);

  const handleMint = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) { setVisible(true); return; }
    setState("minting"); setProgress("…"); setErrMsg(""); setAssetList([]); setBotTaxedCount(0);

    try {
      const umi = createUmi(RPC_ENDPOINT).use(mplCore()).use(mplCandyMachine()).use(walletAdapterIdentity(wallet));

      if (!allowlistData) throw new Error("Allowlist data not loaded — refresh the page.");
      const proofHex = allowlistData.proofs[wallet.publicKey.toString()];
      if (!proofHex) throw new Error("NotInAllowlist");
      const merkleProof: Uint8Array[] = proofHex.map(hexToBytes);
      const merkleRoot                = hexToBytes(allowlistData.merkleRoot);

      const cm         = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
      const candyGuard = await safeFetchCandyGuard(umi, cm.mintAuthority);

      if (Number(cm.itemsRedeemed) >= Number(cm.data.itemsAvailable)) throw new Error("CandyMachineEmpty");

      // Pre-flight mintLimit
      if (candyGuard && findMintCounterPda && safeFetchMintCounter) {
        const limitGuard = candyGuard?.guards?.mintLimit;
        const limit = limitGuard?.__option === "Some" ? Number(limitGuard.value.limit) : null;
        if (limit !== null) {
          try {
            const counterPda = findMintCounterPda(umi, { id: 1, user: umi.identity.publicKey, candyGuard: candyGuard!.publicKey, candyMachine: cm.publicKey });
            const counter = await safeFetchMintCounter(umi, counterPda);
            const count = counter ? Number(counter.count) : 0;
            if (count >= limit) throw new Error("MintLimitReached");
          } catch (e) {
            if (e instanceof Error && e.message === "MintLimitReached") throw e;
          }
        }
      }

      // Pre-flight time window
      const now = Date.now();
      const startGuard = candyGuard?.guards?.startDate;
      const endGuard   = candyGuard?.guards?.endDate;
      if (startGuard?.__option === "Some" && now < Number(startGuard.value.date) * 1000) throw new Error("MintNotLive");
      if (endGuard?.__option   === "Some" && now > Number(endGuard.value.date)   * 1000) throw new Error("MintEnded");

      // Pre-flight SOL (solo tx fees, F1a non ha solPayment)
      const balance = await umi.rpc.getBalance(umi.identity.publicKey);
      const minSol  = BigInt(Math.ceil(0.005 * qty * 1e9));
      if (balance.basisPoints < minSol) throw new Error("NotEnoughSOL");

      // Pre-flight $BRIX
      const ata = findAssociatedTokenPda(umi, { mint: publicKey(BRIX_MINT), owner: umi.identity.publicKey });
      const tokenAccount = await safeFetchToken(umi, ata);
      if (!tokenAccount) throw new Error("BrixAtaMissing");
      const needRaw = BigInt(BRIX_BURN_QTY) * BigInt(qty) * BigInt(10) ** BigInt(BRIX_DECIMALS);
      if (tokenAccount.amount < needRaw) {
        const haveBrix = Number(tokenAccount.amount / BigInt(10) ** BigInt(BRIX_DECIMALS));
        const needBrix = BRIX_BURN_QTY * qty;
        throw new Error(`InsufficientBrix:need=${needBrix}:have=${haveBrix}`);
      }

      // ROUTE: verifica proof e crea AllowListProof PDA
      setProgress("verifying allowlist");
      try {
        await route(umi, {
          candyMachine: cm.publicKey,
          guard:        "allowList",
          group:        none(),
          routeArgs: { path: "proof", merkleRoot, merkleProof },
        }).sendAndConfirm(umi);
        console.log("[F1a] AllowListProof PDA OK");
      } catch (e) {
        const rawMsg = e instanceof Error ? e.message : String(e);
        const lowerMsg = rawMsg.toLowerCase();
        const alreadyInit = lowerMsg.includes("already in use") || lowerMsg.includes("already initialized") ||
                            lowerMsg.includes("0x0");
        if (alreadyInit) { console.log("[F1a] AllowListProof PDA già presente"); }
        else { console.error("[F1a] route error:", rawMsg); throw e; }
      }

      const mintArgs = {
        allowList: some({ merkleProof, merkleRoot }),
        tokenBurn: some({ mint: publicKey(BRIX_MINT) }),
        mintLimit: some({ id: 1 }),
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
            mintArgs,
          }))
      );

      setProgress("building (tx 2/2)");
      const blockhashes = await Promise.all(Array.from({ length: qty }, () => umi.rpc.getLatestBlockhash()));
      const builtTxs    = await Promise.all(builders.map((b, i) => b.setBlockhash(blockhashes[i]).build(umi)));

      let partialSigned = builtTxs;
      for (let i = 0; i < assetSigners.length; i++) partialSigned[i] = await assetSigners[i].signTransaction(partialSigned[i]);

      setProgress("sign");
      let signedTxs: typeof partialSigned;
      try { signedTxs = await umi.identity.signAllTransactions(partialSigned); }
      catch (e: unknown) {
        const eMsg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        if (eMsg.includes("not been authorized") || eMsg.includes("4100")) {
          signedTxs = [];
          for (let i = 0; i < partialSigned.length; i++) {
            setProgress(`sign ${i + 1}/${qty}`);
            signedTxs.push(await umi.identity.signTransaction(partialSigned[i]));
          }
        } else throw e;
      }

      let sentCount = 0;
      for (let i = 0; i < signedTxs.length; i++) {
        setProgress(`${i + 1}/${qty}`);
        let confirmed = false;
        try {
          const sig = await umi.rpc.sendTransaction(signedTxs[i]);
          sentCount++;
          try { await umi.rpc.confirmTransaction(sig, { strategy: { type: "blockhash", ...blockhashes[i] } }); confirmed = true; }
          catch {}
        } catch {}
        if (i < signedTxs.length - 1) await new Promise(r => setTimeout(r, confirmed ? 600 : 1500));
      }

      // Verify via DAS + safeFetchAsset fallback
      setProgress("verifying");
      await new Promise(r => setTimeout(r, 2000));

      const ownedNow = await fetchOwnedInCollection(wallet.publicKey.toString());
      const ownedSet = new Set(ownedNow);
      let mintedAddresses = assetSigners.map(s => s.publicKey.toString()).filter(addr => ownedSet.has(addr));

      const missing = assetSigners.filter(s => !ownedSet.has(s.publicKey.toString()));
      if (missing.length > 0) {
        const TIMEOUT_MS = Math.max(20000, sentCount * 6000);
        const startTime  = Date.now();
        const confirmedSet: Set<string> = new Set(mintedAddresses);
        let prevSize = confirmedSet.size, stable = 0;
        while (Date.now() - startTime < TIMEOUT_MS && confirmedSet.size < assetSigners.length) {
          const remaining = assetSigners.filter(s => !confirmedSet.has(s.publicKey.toString()));
          const checks = await Promise.all(remaining.map(async s => {
            try { const a = await safeFetchAssetV1(umi, s.publicKey); if (a !== null) return s.publicKey.toString(); } catch {} return null;
          }));
          for (const a of checks) if (a) confirmedSet.add(a);
          if (confirmedSet.size === assetSigners.length) break;
          if (confirmedSet.size > 0 && confirmedSet.size === prevSize) { if (++stable >= 2) break; } else stable = 0;
          prevSize = confirmedSet.size;
          if (confirmedSet.size < assetSigners.length) await new Promise(r => setTimeout(r, 2500));
        }
        mintedAddresses = [...confirmedSet];
      }

      const actualMinted = mintedAddresses.length;
      const missingMint  = sentCount - actualMinted;

      let failureReason: "sold_out" | "mint_limit" | null = null;
      if (actualMinted < sentCount) {
        const cmAfter = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ADDRESS));
        if (Number(cmAfter.itemsRedeemed) >= Number(cmAfter.data.itemsAvailable)) failureReason = "sold_out";
        else {
          try {
            const limitGuard = candyGuard?.guards?.mintLimit;
            const limit = limitGuard?.__option === "Some" ? Number(limitGuard.value.limit) : null;
            if (limit !== null && findMintCounterPda && safeFetchMintCounter) {
              const counterPda = findMintCounterPda(umi, { id: 1, user: umi.identity.publicKey, candyGuard: candyGuard!.publicKey, candyMachine: cm.publicKey });
              const counter = await safeFetchMintCounter(umi, counterPda);
              const count = counter ? Number(counter.count) : 0;
              if (count + missingMint > limit) failureReason = "mint_limit";
            }
          } catch {}
        }
      }
      setBotTaxedCount(failureReason === "sold_out" || failureReason === "mint_limit" ? missingMint : 0);

      if (actualMinted === 0) {
        if (failureReason === "sold_out") throw new Error("CandyMachineEmpty");
        if (failureReason === "mint_limit") throw new Error("MintLimitReached");
        throw new Error("No NFTs minted. The wallet may have dropped the batch — try again with fewer.");
      }

      setMintedCount(actualMinted);
      setAssetList(mintedAddresses);
      setState(actualMinted < qty ? "partial" : "success");

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrMsg(parseError(raw));
      setState("error");
    }
  }, [wallet, setVisible, qty, allowlistData]);

  const reset = useCallback(() => { setState("idle"); setProgress(""); setAssetList([]); setMintedCount(0); setBotTaxedCount(0); setErrMsg(""); }, []);

  if (!wallet.connected) return <button className="btn-connect-glow" onClick={() => setVisible(true)}>CONNECT WALLET</button>;
  if (allowlistOk === null) return <button className="btn-connect-glow" disabled>CHECKING ALLOWLIST...</button>;
  if (allowlistOk === false) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ border: "1px solid #ff3333", padding: "10px 14px", fontSize: ".68rem", color: "#ff3333", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
        🚫 Your wallet is not on the F1a allowlist.
      </div>
      <button onClick={() => wallet.disconnect()} style={{ background: "transparent", border: "1px solid #2a2a00", color: "#888870", fontFamily: "var(--font-mono)", fontSize: ".6rem", padding: "6px", cursor: "pointer" }}>DISCONNECT</button>
    </div>
  );

  if (state === "minting") {
    const label = progress === "building (tx 2/2)" ? "PREPARING MINT TX..." :
                  progress === "building" ? "PREPARING..." :
                  progress === "sign" ? "APPROVE TX 2/2 IN WALLET..." :
                  progress === "verifying" ? "VERIFYING..." :
                  progress === "verifying allowlist" ? "APPROVE TX 1/2 IN WALLET..." :
                  `MINTING ${progress}`;
    return <button className="btn-connect-glow" disabled>{label}</button>;
  }

  if (state === "success" || state === "partial") {
    const count = mintedCount || assetList.length;
    const isPartial = state === "partial";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ border: `1px solid ${isPartial ? C_ORANGE : C_GREEN}`, padding: "10px 14px", fontSize: ".65rem", color: isPartial ? C_ORANGE : C_GREEN, fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
          {isPartial ? `⚠️ ${count}/${qty} MINTED [F1a]` : `✅ ${count > 1 ? `${count}× ` : ""}MINT OK [F1a]`}
          {isPartial && (<div style={{ color: "#888870", fontSize: ".6rem", marginTop: "2px" }}>{qty - count} transaction{qty - count > 1 ? "s" : ""} failed.</div>)}
          {assetList.slice(0, 3).map((addr, i) => (
            <div key={addr} style={{ color: "#888870", marginTop: "4px" }}>
              <a href={`https://explorer.solana.com/address/${addr}`} target="_blank" rel="noopener noreferrer" style={{ color: C_GOLD, textDecoration: "none" }}>
                → #{i + 1} {addr.slice(0, 8)}…{addr.slice(-6)} ›
              </a>
            </div>
          ))}
          {assetList.length > 3 && (<div style={{ color: "#555540", marginTop: "2px", fontSize: ".6rem" }}>+{assetList.length - 3} more</div>)}
        </div>
        <button className="btn-connect-glow" onClick={reset} style={{ fontSize: ".7rem" }}>MINT MORE</button>
        <button onClick={() => wallet.disconnect()} style={{ background: "transparent", border: "1px solid #2a2a00", color: "#888870", fontFamily: "var(--font-mono)", fontSize: ".6rem", padding: "6px", cursor: "pointer" }}>DISCONNECT</button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ border: "1px solid #ff3333", padding: "10px 14px", fontSize: ".68rem", color: "#ff3333", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
          ❌ {errMsg}
          {botTaxedCount > 0 && (<div style={{ color: "#888870", fontSize: ".6rem", marginTop: "4px" }}>{botTaxedCount} transaction{botTaxedCount > 1 ? "s" : ""} fired bot-tax.</div>)}
        </div>
        <button className="btn-connect-glow" onClick={reset}>RETRY</button>
        <button onClick={() => wallet.disconnect()} style={{ background: "transparent", border: "1px solid #2a2a00", color: "#888870", fontFamily: "var(--font-mono)", fontSize: ".6rem", padding: "6px", cursor: "pointer" }}>DISCONNECT</button>
      </div>
    );
  }

  // Connected + allowlisted
  const burnTotalBrix = BRIX_BURN_QTY * qty;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ border: "1px solid #2a2a00", padding: "5px 10px", fontSize: ".58rem", color: "#888870", fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>✓ ALLOWLISTED  {wallet.publicKey!.toString().slice(0,6)}...{wallet.publicKey!.toString().slice(-6)}</span>
        <button onClick={() => wallet.disconnect()} style={{ background: "transparent", border: "none", color: "#888870", cursor: "pointer", fontSize: ".58rem", fontFamily: "var(--font-mono)" }}>✕</button>
      </div>

      <QtyInput qty={qty} setQty={setQty} maxMint={maxMint} />

      <button onClick={handleMint}
        style={{ width: "100%", padding: "14px 16px", background: "transparent", border: `1px solid ${C_ORANGE}`, color: C_ORANGE, fontFamily: "var(--font-mono)", fontSize: ".75rem", cursor: "pointer", letterSpacing: ".08em", transition: "background .2s, box-shadow .2s", textAlign: "left", lineHeight: 1.6 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,122,0,.07)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(255,122,0,.3)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
        <div style={{ fontWeight: "bold" }}>🔥 F1a EARLY ACCESS</div>
        <div style={{ fontSize: ".62rem", color: "#888870", marginTop: "2px" }}>
          {qty > 1 ? `${qty} × ${BRIX_BURN_QTY.toLocaleString()} $BRIX = ${burnTotalBrix.toLocaleString()} $BRIX burned` : `${BRIX_BURN_QTY.toLocaleString()} $BRIX burned · 0 SOL`}
        </div>
      </button>
    </div>
  );
}
