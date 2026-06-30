"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import ShareBurnCard from "./ShareBurnCard";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const HELIUS_RPC =
  "https://mainnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
const BRIX_DECIMALS    = 6;
// Token-2022 program (Pump.fun launches use spl-token-2022, not legacy SPL Token).
// BurnChecked layout (opcode 15, u64 amount LE, u8 decimals) is identical on both programs.
const TOKEN_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
// ─────────────────────────────────────────────────────────────────────────────

function burnCheckedIx(
  tokenAccount: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number,
): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(15, 0);
  // u64 LE split in two u32 — writeBigUInt64LE not available in browser Buffer polyfill
  data.writeUInt32LE(Number(amount & BigInt(0xffffffff)), 1);
  data.writeUInt32LE(Number((amount >> BigInt(32)) & BigInt(0xffffffff)), 5);
  data.writeUInt8(decimals, 9);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint,         isSigner: false, isWritable: true },
      { pubkey: owner,        isSigner: true,  isWritable: false },
    ],
    data,
  });
}

function shortAddr(pk: PublicKey): string {
  const s = pk.toString();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export default function BurnButton({ tokenMint }: { tokenMint: string }) {
  const { publicKey, sendTransaction, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  const [showPanel,       setShowPanel]       = useState(false);
  const [amount,          setAmount]          = useState("");
  const [burnedAmount,    setBurnedAmount]    = useState<number>(0);
  const [newSupply,       setNewSupply]       = useState<number | null>(null);
  const [balance,         setBalance]         = useState<number | null>(null);
  const [tokenAccount,    setTokenAccount]    = useState<PublicKey | null>(null);
  const [burning,         setBurning]         = useState(false);
  const [txSig,           setTxSig]           = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [burnSafetyOpen,  setBurnSafetyOpen]  = useState(false);

  useEffect(() => {
    if (!publicKey || !showPanel || !tokenMint) return;
    let alive = true;
    const conn = new Connection(HELIUS_RPC);
    const mint = new PublicKey(tokenMint);
    conn.getParsedTokenAccountsByOwner(publicKey, { mint })
      .then(({ value }) => {
        const uiAmount = value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        if (alive) {
          setBalance(uiAmount);
          // store the actual token account address for the burn tx
          if (value[0]) setTokenAccount(value[0].pubkey);
        }
      })
      .catch(() => { if (alive) setBalance(0); });
    return () => { alive = false; };
  }, [publicKey, showPanel, tokenMint]);

  // Close panel on disconnect
  useEffect(() => {
    if (!connected) { setShowPanel(false); setTxSig(null); setError(null); setTokenAccount(null); setBalance(null); }
  }, [connected]);

  // Reset on account switch — closes panel and reloads balance for the new key
  useEffect(() => {
    setShowPanel(false); setAmount(""); setBalance(null); setTokenAccount(null); setTxSig(null); setError(null);
  }, [publicKey?.toString()]);

  const handleClick = useCallback(() => {
    if (!tokenMint) return;
    if (!connected) { setVisible(true); return; }
    setShowPanel(p => !p);
    setTxSig(null);
    setError(null);
  }, [tokenMint, connected, setVisible]);

  const handleBurn = useCallback(async () => {
    if (!publicKey || !tokenMint) return;
    if (!tokenAccount) { setError("Token account not found"); return; }
    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount <= 0)      { setError("Enter a valid amount"); return; }
    if (balance !== null && rawAmount > balance)  { setError("Insufficient balance");  return; }

    setBurning(true);
    setError(null);
    try {
      const conn  = new Connection(HELIUS_RPC);
      const mint  = new PublicKey(tokenMint);

      // Fetch supply BEFORE burn so we can calculate exact post-burn value
      let beforeSupply = 0;
      try {
        const preRes  = await fetch(HELIUS_RPC, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "pre", method: "getTokenSupply", params: [tokenMint] }),
        });
        const preJson = await preRes.json();
        beforeSupply  = Number(preJson?.result?.value?.uiAmount ?? 0);
      } catch { /* non bloccante */ }

      const lamts = BigInt(Math.floor(rawAmount * 10 ** BRIX_DECIMALS));
      const ix    = burnCheckedIx(tokenAccount, mint, publicKey, lamts, BRIX_DECIMALS);
      const tx    = new Transaction().add(ix);
      const sig   = await sendTransaction(tx, conn);
      await conn.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setBurnedAmount(rawAmount);
      setAmount("");
      setBalance(prev => prev !== null ? Math.max(0, prev - rawAmount) : null);
      // Calculate exact post-burn supply from pre-burn value
      if (beforeSupply > 0) setNewSupply(Math.max(0, beforeSupply - rawAmount));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      const m = msg.toLowerCase();
      if (m.includes("not been authorized") || m.includes("4100")) {
        setError("Wallet account changed — reconnect to continue.");
        disconnect();
      } else {
        setError(msg.length > 90 ? msg.slice(0, 87) + "…" : msg);
      }
    } finally {
      setBurning(false);
    }
  }, [publicKey, tokenMint, tokenAccount, amount, balance, sendTransaction]);

  const isPreLaunch = !tokenMint;

  const handleBurnSafetyAck = () => {
    setBurnSafetyOpen(false);
    handleBurn();
  };

  const handleBurnSafetyDecline = () => {
    setBurnSafetyOpen(false);
  };

  return (
    <>
    {burnSafetyOpen && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
           role="dialog" aria-modal="true" aria-label="Burn safety warning">
        <div style={{ background: "#0a0a0a", border: "1px solid #ff4500", maxWidth: "420px", width: "100%", padding: "32px 24px", fontFamily: "var(--font-mono)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ color: "#ff4500", fontSize: "1.1rem", letterSpacing: ".12em", fontWeight: 700 }}>⚠ BURN IS PERMANENT ⚠</div>
          <div style={{ color: "#ccc", fontSize: ".75rem", lineHeight: 1.7, letterSpacing: ".05em" }}>
            <p style={{ margin: "0 0 10px" }}>Burning $BRIX is <strong style={{ color: "#fff" }}>irreversible</strong>. Tokens sent to the burn instruction are permanently destroyed and cannot be recovered under any circumstances.</p>
            <p style={{ margin: "0 0 10px" }}>• You will <strong style={{ color: "#fff" }}>lose the tokens</strong> you burn. There is no refund, no undo, no appeal.</p>
            <p style={{ margin: "0 0 10px" }}>• Verify the amount carefully before confirming in your wallet.</p>
            <p style={{ margin: 0 }}>• Only connect wallets you own and control. Never burn tokens from a shared or custodial account.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button onClick={handleBurnSafetyAck}
              style={{ flex: 1, padding: "12px", background: "#ff4500", border: "none", color: "#fff", fontFamily: "var(--font-mono)", fontSize: ".7rem", letterSpacing: ".12em", fontWeight: 700, cursor: "pointer" }}>
              I UNDERSTAND
            </button>
            <button onClick={handleBurnSafetyDecline}
              style={{ padding: "12px 16px", background: "transparent", border: "1px solid #555", color: "#888", fontFamily: "var(--font-mono)", fontSize: ".7rem", letterSpacing: ".1em", cursor: "pointer" }}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="burn-btn-wrap" id="sec-burn">
      <button
        className={`btn-burn-flame${isPreLaunch ? " pre-launch" : ""}${showPanel ? " open" : ""}`}
        onClick={handleClick}
        aria-label={isPreLaunch ? "Burn coming soon" : "Burn $BRIX"}
        title={isPreLaunch ? "Token not live yet" : undefined}
      >
        <span className="burn-flame-icon" aria-hidden>🔥</span>
        <span className="burn-btn-label">BURN $BRIX</span>
        {isPreLaunch && <span className="burn-soon-badge">COMING SOON</span>}
      </button>

      {/* Wallet status row — visible when token is live */}
      {!isPreLaunch && (
        <div className="burn-wallet-status">
          {connected && publicKey ? (
            <>
              <span className="burn-wallet-name">
                {wallet?.adapter.name ?? "Wallet"} · {shortAddr(publicKey)}
              </span>
              <button className="burn-disconnect-btn" onClick={disconnect}>
                DISCONNECT
              </button>
            </>
          ) : (
            <span className="burn-connect-hint">↑ CONNECT WALLET TO BURN</span>
          )}
        </div>
      )}

      {showPanel && connected && !isPreLaunch && (
        <div className="burn-panel" role="dialog" aria-label="Burn $BRIX">
          {txSig ? (
            <div className="burn-success">
              <div className="burn-success-icon">🔥</div>
              <div className="burn-success-title">BURNED.</div>
              <div className="burn-success-sub">The supply is lower. The Goal is Zer0.</div>
              <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" className="burn-tx-link">
                View on Solscan ›
              </a>
              {publicKey && (
                <ShareBurnCard
                  amount={burnedAmount}
                  wallet={publicKey.toString()}
                  txSig={txSig}
                  ca={tokenMint}
                  supply={newSupply ?? undefined}
                />
              )}
              <button className="burn-again-btn" onClick={() => { setTxSig(null); setNewSupply(null); }}>BURN MORE</button>
            </div>
          ) : (
            <>
              <div className="burn-balance">
                {balance === null
                  ? "Loading balance…"
                  : `YOUR BALANCE: ${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} $BRIX`}
              </div>
              <div className="burn-input-row">
                <input
                  className="burn-input"
                  type="number" min="1" step="any"
                  placeholder="Amount to burn"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(null); }}
                  disabled={burning}
                  onKeyDown={e => e.key === "Enter" && handleBurn()}
                />
                <button
                  className="burn-max-btn"
                  onClick={() => balance !== null && setAmount(String(Math.floor(balance)))}
                  disabled={burning || balance === null || balance === 0}
                >MAX</button>
              </div>
              {error && <div className="burn-error">{error}</div>}
              <button
                className="burn-confirm-btn"
                onClick={() => setBurnSafetyOpen(true)}
                disabled={burning || !amount || parseFloat(amount) <= 0}
              >
                {burning
                  ? <span className="burn-spinner">BURNING…</span>
                  : `🔥 BURN ${amount ? Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 }) : ""} $BRIX`}
              </button>
              <div className="burn-warning">⚠ Burns are permanent and irreversible.</div>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}
