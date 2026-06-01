"use client";

/**
 * ShareBurnCard
 * Loads burn-card-bg.png from /public, overlays dynamic burn data via Canvas,
 * asks the user whether to download, then opens a pre-filled tweet.
 */

import { useCallback, useState } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SITE_URL  = "brix-burns.com";
const X_HANDLE  = "@BRIX_burns";
const CARD_W    = 1200;
const CARD_H    = 630;

// Dynamic text area (leave room matching the blank zone in burn-card-bg.png)
const DYN_X     = 62;   // left edge of dynamic area
const DYN_Y     = 218;  // top edge of dynamic area
// ─────────────────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}
function shortTx(tx: string): string {
  if (tx.length <= 12) return tx;
  return `${tx.slice(0, 6)}…${tx.slice(-6)}`;
}

/** Load a Google Font for use inside Canvas via FontFace API. */
async function loadGoogleFont(family: string, weight = "400"): Promise<string> {
  try {
    const cssResp = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`
    );
    const css = await cssResp.text();
    // grab first woff2 src
    const match = css.match(/src:\s*url\(([^)]+\.woff2)\)/);
    if (!match) throw new Error("no woff2");
    const ff = new FontFace(family, `url(${match[1]})`, { weight });
    await ff.load();
    document.fonts.add(ff);
    return family;
  } catch {
    return "monospace";
  }
}

/** Load the background image. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

/** Core canvas drawing — returns a PNG Blob. */
async function generateCard(amount: number, wallet: string, txSig: string, supply?: number): Promise<Blob> {
  // Load fonts in parallel with background image
  const [orbFont, monoFont, bgImg] = await Promise.all([
    loadGoogleFont("Orbitron",       "900"),
    loadGoogleFont("Share Tech Mono", "400"),
    loadImage("/burn-card-bg.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // ── background image ──────────────────────────────────────────────────────
  ctx.drawImage(bgImg, 0, 0, CARD_W, CARD_H);

  // All positions below are absolute on the 1200×630 canvas.
  // The dynamic area starts at DYN_X=62, DYN_Y=218.

  // ── flame emoji + amount ─────────────────────────────────────────────────
  const numBaseY = DYN_Y + 90; // baseline of the big number row

  ctx.font      = "68px serif";
  ctx.textAlign = "left";
  ctx.fillText("🔥", DYN_X, numBaseY);

  const amountStr = `${amount.toLocaleString("en-US")} $BRIX`;
  ctx.fillStyle = "#ffffff";
  ctx.font      = `900 82px ${orbFont}`;
  ctx.fillText(amountStr, DYN_X + 80, numBaseY);

  // ── subtitle "BURNED FOREVER. SUPPLY ↓ HAS NOW REACHED X" ───────────────
  const supplyStr = supply
    ? ` HAS NOW REACHED ${supply.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : "";
  ctx.fillStyle    = "#ff4500";
  ctx.font         = `400 17px ${monoFont}`;
  ctx.letterSpacing = "0.10em";
  ctx.fillText(`BURNED FOREVER. SUPPLY ↓${supplyStr}`, DYN_X + 80, numBaseY + 32);

  // ── divider ───────────────────────────────────────────────────────────────
  ctx.strokeStyle  = "#ff4500";
  ctx.lineWidth    = 1;
  ctx.letterSpacing = "0";
  ctx.beginPath();
  ctx.moveTo(DYN_X, numBaseY + 52);
  ctx.lineTo(DYN_X + 820, numBaseY + 52);
  ctx.stroke();

  // ── WALLET ────────────────────────────────────────────────────────────────
  const walletLabelY = numBaseY + 85;
  ctx.fillStyle    = "#666666";
  ctx.font         = `400 11px ${monoFont}`;
  ctx.letterSpacing = "0.14em";
  ctx.fillText("WALLET", DYN_X, walletLabelY);

  ctx.fillStyle    = "#cccccc";
  ctx.font         = `400 15px ${monoFont}`;
  ctx.letterSpacing = "0.06em";
  ctx.fillText(shortAddr(wallet), DYN_X, walletLabelY + 22);

  // ── TX ────────────────────────────────────────────────────────────────────
  const txLabelY = walletLabelY + 60;
  ctx.fillStyle    = "#666666";
  ctx.font         = `400 11px ${monoFont}`;
  ctx.letterSpacing = "0.14em";
  ctx.fillText("TX", DYN_X, txLabelY);

  ctx.fillStyle    = "#cccccc";
  ctx.font         = `400 15px ${monoFont}`;
  ctx.letterSpacing = "0.06em";
  ctx.fillText(`solscan.io/tx/${shortTx(txSig)}`, DYN_X, txLabelY + 22);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error("toBlob failed")),
      "image/png"
    );
  });
}

/** Pre-filled tweet text — no hashtags. */
function buildTweetText(amount: number, txSig: string, ca: string): string {
  return [
    `🔥 Just burned ${amount.toLocaleString("en-US")} $BRIX`,
    ``,
    `The supply just dropped. The goal is zero.`,
    ``,
    `${SITE_URL} | ${X_HANDLE}`,
    ``,
    ...(ca ? [`CA: ${ca}`, ``] : []),
    `TX: https://solscan.io/tx/${txSig}`,
  ].join("\n");
}

function openTweet(amount: number, txSig: string, ca: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildTweetText(amount, txSig, ca))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

type UIState = "idle" | "confirm" | "generating" | "done" | "error";

interface ShareBurnCardProps {
  amount:   number;
  wallet:   string;
  txSig:    string;
  ca:       string;   // token mint / contract address
  supply?:  number;   // updated total supply after burn (optional)
}

const S: Record<string, React.CSSProperties> = {
  btn: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "8px",
    width:          "100%",
    padding:        "10px 20px",
    background:     "transparent",
    border:         "1px solid #e63333",
    color:          "#e63333",
    fontFamily:     "var(--font-mono)",
    fontSize:       ".7rem",
    letterSpacing:  ".12em",
    fontWeight:     700,
    cursor:         "pointer",
    borderRadius:   "3px",
  },
  confirmBox: {
    width:        "100%",
    border:       "1px solid #333",
    background:   "#111",
    padding:      "14px 16px",
    display:      "flex",
    flexDirection: "column" as const,
    gap:          "10px",
  },
  confirmText: {
    color:         "#aaa",
    fontFamily:    "var(--font-mono)",
    fontSize:      ".62rem",
    letterSpacing: ".1em",
    lineHeight:    1.5,
  },
  confirmRow: {
    display: "flex",
    gap:     "8px",
  },
  confirmYes: {
    flex:          1,
    padding:       "8px",
    background:    "#e63333",
    border:        "none",
    color:         "#fff",
    fontFamily:    "var(--font-mono)",
    fontSize:      ".65rem",
    letterSpacing: ".1em",
    fontWeight:    700,
    cursor:        "pointer",
  },
  confirmSkip: {
    flex:          1,
    padding:       "8px",
    background:    "transparent",
    border:        "1px solid #333",
    color:         "#666",
    fontFamily:    "var(--font-mono)",
    fontSize:      ".65rem",
    letterSpacing: ".1em",
    cursor:        "pointer",
  },
};

export default function ShareBurnCard({ amount, wallet, txSig, ca, supply }: ShareBurnCardProps) {
  const [state,  setState]  = useState<UIState>("idle");
  const [errMsg, setErrMsg] = useState("");

  // User clicked "SHARE ON X" → show confirm panel
  const handleShareClick = useCallback(() => {
    setState("confirm");
  }, []);

  // User chose to download + tweet
  const handleDownloadAndTweet = useCallback(async () => {
    setState("generating");
    try {
      const blob = await generateCard(amount, wallet, txSig, supply);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `brix-burn-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      openTweet(amount, txSig, ca);
      setState("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "error");
      setState("error");
    }
  }, [amount, wallet, txSig, ca, supply]);

  // User skips download, only tweets
  const handleTweetOnly = useCallback(() => {
    openTweet(amount, txSig, ca);
    setState("done");
  }, [amount, txSig, ca]);

  if (state === "confirm") {
    return (
      <div style={S.confirmBox}>
        <div style={S.confirmText}>
          Download the burn card and attach it to your tweet?
        </div>
        <div style={S.confirmRow}>
          <button style={S.confirmYes} onClick={handleDownloadAndTweet}>
            ⬇ YES, DOWNLOAD
          </button>
          <button style={S.confirmSkip} onClick={handleTweetOnly}>
            SKIP, JUST TWEET
          </button>
        </div>
        <button
          style={{ ...S.confirmSkip, textAlign: "center" as const }}
          onClick={() => setState("idle")}
        >
          CANCEL
        </button>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <button style={{ ...S.btn, cursor: "wait", opacity: 0.7 }} disabled>
        ⏳ GENERATING CARD…
      </button>
    );
  }

  if (state === "error") {
    return (
      <button style={{ ...S.btn, borderColor: "#ff4500", color: "#ff4500" }}
        onClick={() => setState("idle")}>
        ⚠ ERROR — RETRY ({errMsg.slice(0, 30)})
      </button>
    );
  }

  if (state === "done") {
    return (
      <button style={{ ...S.btn, borderColor: "#39ff14", color: "#39ff14" }}
        onClick={() => setState("idle")}>
        ✓ SHARED
      </button>
    );
  }

  // idle
  return (
    <button style={S.btn} onClick={handleShareClick}>
      SHARE ON&nbsp;
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </button>
  );
}
