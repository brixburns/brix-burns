"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";

// ── LIVE TRACKER CONFIG ───────────────────────────────────────────────────────
// TOKEN_MINT empty = pre-launch. The tracker makes no network calls and every
// stat stays at its zeroed default. Set the new chain's mint + RPC at launch.
const TOKEN_MINT: string   = "";
const RPC_ENDPOINT: string = "";
const INITIAL_SUPPLY  = 1_000_000_000;
const TARGET_PERCENT  = 50;
const REFRESH_BURN_MS = 30_000;
const REFRESH_SLOW_MS = 120_000;
// ─────────────────────────────────────────────────────────────────────────────

// ── CONTRACT ADDRESS ─────────────────────────────────────────────────────────
// Mockup until the token launches. Swap for the real address at launch.
const CA_MOCKUP = "BRiXc0ntr4ct";

// ── EXTERNAL LINKS ───────────────────────────────────────────────────────────
const X_LINK = "https://x.com/BRIX_burns";

// ── STATS BAR TYPE ────────────────────────────────────────────────────────────
type StatItem = { label: string; value: string; live?: boolean };

// ── NUMBER FORMATTERS ─────────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPrice(n: number): string {
  if (n === 0)      return "$0.000000";
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.001)    return `$${n.toFixed(6)}`;
  if (n < 1)        return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
function fmtUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(n: number): string { return `${n.toFixed(2)}%`; }

// ── LIVE TRACKER HOOK ─────────────────────────────────────────────────────────
type TrackerData = {
  burned: string; burnPct: number; burnPctStr: string;
  burnUsd: string; price: string; mcap: string;
  supply: string; holders: string;
  priceChange24h: string; priceChangePositive: boolean;
  loading: boolean;
};
const TRACKER_DEFAULT: TrackerData = {
  burned: "00,000,000", burnPct: 0, burnPctStr: "00.00%",
  burnUsd: "$00,000.00", price: "$0.000000", mcap: "$000,000",
  supply: "000,000,000", holders: "—",
  priceChange24h: "+0.00%", priceChangePositive: true,
  loading: false,
};

function useLiveTracker(): TrackerData {
  const [data, setData] = useState<TrackerData>(TRACKER_DEFAULT);

  const loadBurn = useCallback(async () => {
    if (!TOKEN_MINT || !RPC_ENDPOINT) return;
    try {
      const supplyRes  = await fetch(RPC_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "supply",
          method: "getTokenSupply", params: [TOKEN_MINT] }),
      });
      const supplyJson = await supplyRes.json();
      const currentSupply = Number(supplyJson?.result?.value?.uiAmount ?? INITIAL_SUPPLY);
      const burned  = Math.max(0, INITIAL_SUPPLY - currentSupply);
      const burnPct = (burned / INITIAL_SUPPLY) * 100;
      setData(prev => ({
        ...prev,
        burned:    fmtTokens(burned),
        burnPct,
        burnPctStr: fmtPct(burnPct),
        burnUsd:   fmtUsd((prev.price ? Number(prev.price.replace(/[$,]/g, "")) : 0) * burned),
        supply:    fmtTokens(currentSupply),
        loading:   false,
      }));
    } catch { setData(prev => ({ ...prev, loading: false })); }
  }, []);

  const loadSlow = useCallback(async () => {
    if (!TOKEN_MINT) return;
    let priceNum = 0, mcapNum = 0, change24h = 0;
    try {
      const dexRes  = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
      const dexJson = await dexRes.json();
      type DexPair = {
        priceUsd?: string; marketCap?: number; fdv?: number;
        liquidity?: { usd?: number };
        priceChange?: { h24?: number };
      };
      const pairs: DexPair[] = dexJson?.pairs ?? [];
      const pair = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      priceNum  = pair?.priceUsd ? Number(pair.priceUsd) : 0;
      mcapNum   = pair?.marketCap ?? pair?.fdv ?? 0;
      change24h = pair?.priceChange?.h24 ?? 0;
    } catch { /* price unavailable */ }

    const changeSign = change24h >= 0 ? "+" : "";
    setData(prev => ({
      ...prev,
      price:               fmtPrice(priceNum),
      mcap:                fmtUsd(mcapNum),
      priceChange24h:      `${changeSign}${change24h.toFixed(2)}%`,
      priceChangePositive: change24h >= 0,
    }));
  }, []);

  useEffect(() => {
    if (!TOKEN_MINT) return;
    loadBurn();
    loadSlow();
    const fastId = setInterval(loadBurn, REFRESH_BURN_MS);
    const slowId = setInterval(loadSlow, REFRESH_SLOW_MS);
    return () => { clearInterval(fastId); clearInterval(slowId); };
  }, [loadBurn, loadSlow]);

  return data;
}

// ── ICONS ────────────────────────────────────────────────────────────────────
function CopyIcon({ done }: { done: boolean }) {
  if (done) return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <polyline points="2,7 5,10 11,3" stroke="#39ff14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" fill="var(--bg)"/>
    </svg>
  );
}

// ── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: StatItem[] }) {
  const [paused, setPaused] = useState(false);
  const items = [...stats, ...stats, ...stats, ...stats];
  return (
    <div
      className="stats-outer"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="stats-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
        {items.map((s, i) => (
          <div className="stat-item" key={`${s.label}-${i}`}>
            <div className="s-label">{s.label || " "}</div>
            {s.live ? (
              <div className="s-value s-soon"><span className="dot-red"/>NOT LIVE</div>
            ) : (
              <div className="s-value">{s.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================
export default function BrixPage() {
  const [copied,   setCopied]   = useState(false);
  const [counter,  setCounter]  = useState<"brix"|"percent"|"usd">("brix"); // DEFAULT: $BRIX BURNED
  const [flipping, setFlipping] = useState(false);

  const tracker = useLiveTracker();
  const liveStats: StatItem[] = [
    { label: "PRICE",       value: tracker.price },
    { label: "MARKET CAP",  value: tracker.mcap },
    { label: "SUPPLY",      value: tracker.supply },
    { label: "BURNED",      value: tracker.burnPctStr },
    { label: "TARGET BURN", value: `${TARGET_PERCENT}%` },
    { label: "HOLDERS",     value: tracker.holders },
    { label: "STATUS",      value: "", live: true },
  ];

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flip = useCallback((target: "brix"|"percent"|"usd") => {
    if (target === counter) return;
    setFlipping(true);
    flipTimerRef.current = setTimeout(() => {
      setCounter(target);
      setFlipping(false);
    }, 300);
  }, [counter]);
  useEffect(() => () => { if (flipTimerRef.current) clearTimeout(flipTimerRef.current); }, []);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(CA_MOCKUP);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
  }, []);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      {/* == NAV ============================================================ */}
      <nav id="top">
        <button className="nav-logo" onClick={scrollTop}>
          <Image src="/favicon.svg" alt="$BRIX" width={26} height={26} priority/>
          $BRIX
        </button>

        <div className="ca-badge" onClick={copy}>
          {CA_MOCKUP}
          <button className="copy-btn" aria-label="Copy address">
            <CopyIcon done={copied}/>
          </button>
        </div>

        {/* Intentionally empty — holds the nav's right-hand spacing while no links are live */}
        <ul className="nav-links"/>

        <div className="nav-right-group">
          <div className="price-inline">
            <span className="pi-num">{tracker.price}</span>
            <span className="pi-change" style={{ color: tracker.priceChangePositive ? "var(--green)" : "var(--orange)" }}>
              {tracker.priceChange24h}
            </span>
          </div>
        </div>
      </nav>

      <StatsBar stats={liveStats}/>

      {/* == HERO =========================================================== */}
      <section className="hero" id="sec-mission">
        <div className="corner tl"/><div className="corner tr"/>
        <div className="corner bl"/><div className="corner br"/>

        <div className="hero-eyebrow">// A TOKEN THAT BURNS ITSELF</div>

        <h1 className="hero-title">
          <span className="h-dollar">$</span><span className="h-brix">BRIX</span>{" "}
          <span className="h-burns">BURNS</span><span className="h-dot">.</span>
        </h1>

        <div className="mantra">
          THE GOAL IS <span className="m-zero">TO HALVE IT</span>.
        </div>
      </section>

      {/* == BURN COUNTER (tri-state) ======================================= */}
      <div className="burn-section">
        <div className="burn-tabs">
          <button className={`burn-tab${counter === "percent" ? " active-percent" : ""}`} onClick={() => flip("percent")}>
            % OF SUPPLY
          </button>
          <button className={`burn-tab${counter === "brix" ? " active-brix" : ""}`} onClick={() => flip("brix")}>
            $BRIX BURNED
          </button>
          <button className={`burn-tab${counter === "usd" ? " active-usd" : ""}`} onClick={() => flip("usd")}>
            USD VALUE
          </button>
        </div>
        <div className={`burn-box ${counter}-mode`}>
          <div className={`burn-flip${flipping ? " flipping" : ""}`}>
            {counter === "brix"    && <div className="burn-value brix">{tracker.burned}</div>}
            {counter === "percent" && <div className="burn-value percent">{tracker.burnPctStr}</div>}
            {counter === "usd"     && <div className="burn-value usd">{tracker.burnUsd}</div>}
          </div>
        </div>

        <div className="burn-progress-wrap">
          <div className="burn-progress-track">
            <div className="burn-progress-fill" style={{ width: `${Math.min(tracker.burnPct, 100)}%` }}/>
            <div className="burn-progress-target" title={`Target: ${TARGET_PERCENT}%`}/>
          </div>
          <div className="burn-progress-labels">
            <span>0%</span>
            <span>25%</span>
            <span className="target-label">{TARGET_PERCENT}% TARGET</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="tagline">
        <div className="tl-cta">
          <span className="btn btn-primary btn-disabled" title="Token Not Live Yet" aria-disabled="true">GET $BRIX &nbsp;›</span>
          <a href={X_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            FOLLOW &nbsp;<Image src="/logox.svg" alt="X" width={14} height={14} style={{verticalAlign:"middle",opacity:.85}}/>
          </a>
        </div>
        <div className="tl-sub">ONE TOKEN. ONE MISSION.</div>
      </div>

      <footer>
        <div className="footer-line">// THE GOAL IS TO HALVE IT</div>
        <div className="footer-brand">$BRIX BURNS</div>
        <div className="footer-disclaimer">
          Nothing on this site constitutes financial advice. Cryptocurrency and NFT markets involve risk. Burns are permanent.
        </div>
        <div className="footer-corners">
          <div className="f-corner fl"/>
          <div className="f-corner fr"/>
        </div>
      </footer>
    </>
  );
}
