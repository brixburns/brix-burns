"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const HELIUS_MAINNET =
  "https://mainnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
const BRIX_DECIMALS = 6; // decimali $BRIX
// ─────────────────────────────────────────────────────────────────────────────

export default function BurnButton({ tokenMint }: { tokenMint: string }) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [showPanel, setShowPanel]   = useState(false);
  const [amount,    setAmount]      = useState("");
  const [balance,   setBalance]     = useState<number | null>(null);
  const [burning,   setBurning]     = useState(false);
  const [txSig,     setTxSig]       = useState<string | null>(null);
  const [error,     setError]       = useState<string | null>(null);

  // Fetch balance quando il panel si apre
  useEffect(() => {
    if (!publicKey || !showPanel || !tokenMint) return;
    let alive = true;
    const conn = new Connection(HELIUS_MAINNET);
    getAssociatedTokenAddress(new PublicKey(tokenMint), publicKey)
      .then(ata => conn.getTokenAccountBalance(ata))
      .then(res => { if (alive) setBalance(res.value.uiAmount ?? 0); })
      .catch(() => { if (alive) setBalance(0); });
    return () => { alive = false; };
  }, [publicKey, showPanel, tokenMint]);

  const handleClick = useCallback(() => {
    if (!tokenMint) return;          // pre-launch: inattivo
    if (!connected) { setVisible(true); return; }
    setShowPanel(p => !p);
    setTxSig(null);
    setError(null);
  }, [tokenMint, connected, setVisible]);

  const handleBurn = useCallback(async () => {
    if (!publicKey || !tokenMint) return;
    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount <= 0) { setError("Enter a valid amount"); return; }
    if (balance !== null && rawAmount > balance)  { setError("Insufficient balance");  return; }

    setBurning(true);
    setError(null);
    try {
      const conn = new Connection(HELIUS_MAINNET);
      const mint = new PublicKey(tokenMint);
      const ata  = await getAssociatedTokenAddress(mint, publicKey);
      const ix   = createBurnCheckedInstruction(
        ata, mint, publicKey,
        BigInt(Math.floor(rawAmount * 10 ** BRIX_DECIMALS)),
        BRIX_DECIMALS,
      );
      const tx  = new Transaction().add(ix);
      const sig = await sendTransaction(tx, conn);
      await conn.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setAmount("");
      setBalance(prev => (prev !== null ? Math.max(0, prev - rawAmount) : null));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.length > 90 ? msg.slice(0, 87) + "…" : msg);
    } finally {
      setBurning(false);
    }
  }, [publicKey, tokenMint, amount, balance, sendTransaction]);

  const isPreLaunch = !tokenMint;

  return (
    <div className="burn-btn-wrap" id="sec-burn">
      {/* ── FLAME BUTTON ────────────────────────────────────────────────── */}
      <button
        className={`btn-burn-flame${isPreLaunch ? " pre-launch" : ""}${showPanel ? " open" : ""}`}
        onClick={handleClick}
        aria-label={isPreLaunch ? "Burn coming soon" : connected ? "Burn $BRIX" : "Connect wallet to burn"}
        title={isPreLaunch ? "Token not live yet" : undefined}
      >
        <span className="burn-flame-icon" aria-hidden>🔥</span>
        <span className="burn-btn-label">
          {isPreLaunch
            ? "BURN $BRIX"
            : connected
            ? "BURN $BRIX"
            : "CONNECT WALLET"}
        </span>
        {isPreLaunch && <span className="burn-soon-badge">COMING SOON</span>}
      </button>

      {/* ── BURN PANEL ──────────────────────────────────────────────────── */}
      {showPanel && connected && !isPreLaunch && (
        <div className="burn-panel" role="dialog" aria-label="Burn $BRIX">
          {txSig ? (
            /* ── SUCCESS ── */
            <div className="burn-success">
              <div className="burn-success-icon">🔥</div>
              <div className="burn-success-title">BURNED.</div>
              <div className="burn-success-sub">The supply is lower. The mission continues.</div>
              <a
                href={`https://solscan.io/tx/${txSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="burn-tx-link"
              >
                View on Solscan ›
              </a>
              <button
                className="burn-again-btn"
                onClick={() => { setTxSig(null); }}
              >
                BURN MORE
              </button>
            </div>
          ) : (
            /* ── FORM ── */
            <>
              <div className="burn-balance">
                {balance === null
                  ? "Loading balance…"
                  : `YOUR BALANCE: ${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} $BRIX`}
              </div>
              <div className="burn-input-row">
                <input
                  className="burn-input"
                  type="number"
                  min="1"
                  step="any"
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
                >
                  MAX
                </button>
              </div>
              {error && <div className="burn-error">{error}</div>}
              <button
                className="burn-confirm-btn"
                onClick={handleBurn}
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
  );
}
