"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// import MintButton from "./MintButtons/MintButtonF1a";
import dynamic from "next/dynamic";
const BurnButton = dynamic(() => import("./BurnButton"), { ssr: false });

// ── MODULAR MANTRA ───────────────────────────────────────────────────────────
// Change this single constant to update the mantra everywhere on the page.
// Post-mint: set to "" to display only "THE GOAL IS ZERO." (no tail).
const MANTRA_TAIL = ""; // was: "EVERY MINT GETS US CLOSER."

// ── LIVE TRACKER CONFIG ───────────────────────────────────────────────────────
const TOKEN_MINT     = "HCYUytzPBSRBJxemsyDEe9tHxg86cViV3Y2ZRny4pump";
const INITIAL_SUPPLY = 1_000_000_000;
const HELIUS_RPC     = "https://mainnet.helius-rpc.com/?api-key=a118acee-0734-42a5-a29f-2f330eb0c49c";
const TARGET_PERCENT  = 90;
const REFRESH_BURN_MS = 30_000;
const REFRESH_SLOW_MS = 120_000;
// ─────────────────────────────────────────────────────────────────────────────

// ── EXTERNAL LINKS ───────────────────────────────────────────────────────────
const GET_BRIX_LINK = "https://pump.fun/coin/HCYUytzPBSRBJxemsyDEe9tHxg86cViV3Y2ZRny4pump";
const X_LINK        = "https://x.com/BRIX_burns";

// ── TOP BURNERS WORKER URL ────────────────────────────────────────────────────
const TOP_BURNERS_URL = "https://brix-top-burners.420losrs.workers.dev/top-burners";

// ── WALLETS EXCLUDED FROM LEADERBOARD (team) ─────────────────────────────────
const EXCLUDED_WALLETS: string[] = [
  "9UTzAk9qEXgRTNbmVrawjJBgL5T9PyfNrAEJPrynix5N", // CREATOR / PUMP.FUN
  "6WM4d2VfxMogo2Dd4URSBczLP9jopMRwwtGARjrn6eS7", // dev operations (dev allocation burns)
];

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
  supply: "1,000,000,000", holders: "—",
  priceChange24h: "+0.00%", priceChangePositive: true,
  loading: true,
};

function useLiveTracker(): TrackerData {
  const [data, setData] = useState<TrackerData>({ ...TRACKER_DEFAULT, loading: false });

  const loadBurn = useCallback(async () => {
    if (!TOKEN_MINT) return;
    try {
      const supplyRes  = await fetch(HELIUS_RPC, {
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

    // Holders: Solscan primary, Helius fallback
    let holdersStr = "—";
    try {
      const solRes  = await fetch(
        `https://public-api.solscan.io/token/holders?tokenAddress=${TOKEN_MINT}&limit=1&offset=0`
      );
      const solJson: { total?: number } = await solRes.json();
      if (typeof solJson?.total === "number" && solJson.total > 0) {
        holdersStr = fmtTokens(solJson.total);
      } else {
        throw new Error("solscan no total");
      }
    } catch {
      try {
        let total = 0;
        let cursor: string | null = null;
        do {
          const holdRes: Response = await fetch(HELIUS_RPC, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: "holders",
              method: "getTokenAccounts",
              params: { mint: TOKEN_MINT, limit: 1000, cursor,
                options: { showZeroBalance: false } } }),
          });
          const holdJson: { result?: { token_accounts?: unknown[]; cursor?: string } } = await holdRes.json();
          const accounts: unknown[] = holdJson?.result?.token_accounts ?? [];
          total  += accounts.length;
          cursor  = holdJson?.result?.cursor ?? null;
        } while (cursor);
        if (total > 0) holdersStr = fmtTokens(total);
      } catch { /* holders unavailable */ }
    }

    const changeSign = change24h >= 0 ? "+" : "";
    setData(prev => ({
      ...prev,
      price:               fmtPrice(priceNum),
      mcap:                fmtUsd(mcapNum),
      holders:             holdersStr,
      priceChange24h:      `${changeSign}${change24h.toFixed(2)}%`,
      priceChangePositive: change24h >= 0,
    }));
  }, []);

  useEffect(() => {
    loadBurn();
    loadSlow();
    const fastId = setInterval(loadBurn, REFRESH_BURN_MS);
    const slowId = setInterval(loadSlow, REFRESH_SLOW_MS);
    return () => { clearInterval(fastId); clearInterval(slowId); };
  }, [loadBurn, loadSlow]);

  return data;
}

// ── FAQ DATA ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is $BRIX, really?",
    a: "$BRIX is a Solana token engineered to burn itself out of existence. The goal is zero supply. Every NFT mint, every secondary sale, every trading fee feeds the burn. It's not a utility token waiting for a use case — the destruction is the use case.",
  },
  {
    q: "What is TRIXSTER?",
    a: "TRIXSTER is the collection of 3,333 NFTs that fuels the burn. Each mint destroys $BRIX. The NFTs are the mechanism. The burn is the mission.",
  },
  {
    q: "How does minting work?",
    a: "Four phases (F1–F4). Each phase requires burning a set amount of $BRIX to access the mint, then paying 0.05–0.18 SOL per NFT (price increases per phase). A SOL-only alternative path exists for users without $BRIX — it triggers buyback-and-burn automatically. Each phase has its own mint limit per wallet. Check the official docs or announcements for the exact cap per phase. N.B. The interface allows minting up to 5 NFTs per transaction for reliability reasons",
  },
  {
    q: "How does Burn work?",
    a: "Burning $BRIX permanently removes tokens from the circulating supply. Once confirmed on-chain, the operation is irreversible — tokens are gone forever. To burn: connect your wallet, open the Burn panel, enter an amount, and confirm the transaction in your wallet. The balance shown is pulled live from the blockchain.",
  },
  {
    q: "Why should I burn my $BRIX?",
    a: "Because the supply going down is the entire point. Burning gates the mint, but it's also a public commitment to the mission. Top burners are tracked on the leaderboard and get airdrops. The fewer tokens in circulation, the closer we are to zero.",
  },
  {
    q: "Who is the team?",
    a: "Anonymous. The team operates publicly through on-chain wallets, not identity. Dev allocation is 5% bought at deploy, with 1% burned immediately and the remaining 4% burned over time — 100% of dev allocation will be destroyed. All wallets are publicly disclosed in the docs.",
  },
  {
    q: "What are the rarity tiers?",
    a: "Five tiers: Legendary (82), Epic (259), Golden (331), Rare (709), Uncommon (1,952). Tier is hidden until reveal. Higher tiers receive larger reward shares and higher jackpot odds. Uncommon holders are eligible for jackpot draws only.",
  },
  {
    q: "Are rewards guaranteed?",
    a: "No. Rewards are a proportional share of the actual collected pool, weighted by tier. Strong phase performance means larger rewards. Weak phase performance means smaller ones. There is no guaranteed minimum.",
  },
  {
    q: "What is the Jackpot?",
    a: "20% of each phase's pool is reserved for jackpot draws. Winners are selected by weighted probability — higher rarity raises your odds, but anyone can win. 30 jackpot winners across all four phases.",
  },
  {
    q: "What are Top Burners?",
    a: "A permanent leaderboard of wallets that voluntarily burn the most $BRIX. Top 20 get airdropped NFTs. Top 5 get extra. The leaderboard tracks burns across the entire lifetime of the project, not just during mint phases. Top Burners are the project's frontline.",
  },
  {
    q: "What is the F1 Early Stage?",
    a: "A pre-launch access tier reserved for the project's earliest supporters. 40 spots are allocated to Top Burners — the wallets that burn the most $BRIX before mint opens. Additional spots are distributed through social and project engagement milestones. F1 Early Stage is capped at 100 NFTs total, with a maximum of 2 mints per wallet. Note: the allocation may be slightly over-subscribed — not all eligible wallets are guaranteed a spot. Mint price is 0 SOL (burn requirement still applies).",
  },
  {
    q: "Will the burn continue after mint?",
    a: "Yes. The mint event is the beginning, not the end. Secondary royalties (6.9%), Pump.fun trading fees, and a 15% buyback-and-burn slice of every phase pool keep the supply trending toward zero. The long-term target is 90% destroyed.",
  },
  {
    q: "Is this safe?",
    a: "Standard Metaplex Core + Sugar CLI candy machines, no custom contract code. Mint SOL routes directly to a hardware-wallet-controlled cold treasury. That said, crypto is volatile and burns are permanent. Read the safety section in the docs before connecting your wallet.",
  },
  {
    q: "Where do I find more details?",
    a: "Full documentation — tokenomics, burn mechanics, mint phases, reward formulas, jackpot probabilities, team & treasury wallets, safety guidelines — at brix-burns.com/docs.html",
  },
];

// ── TOP BURNERS — live leaderboard from Cloudflare Worker ────────────────────
type BurnerEntry = { rank: number; wallet: string; burned: string };

type WorkerBurner = { rank: number; wallet: string; burned: number };

function useTopBurners() {
  const [burners, setBurners] = useState<BurnerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res  = await fetch(TOP_BURNERS_URL);
        const data: WorkerBurner[] = await res.json();
        if (!cancelled) {
          setBurners(
            data
              .filter(d => !EXCLUDED_WALLETS.includes(d.wallet))
              .map((d, i) => ({
                rank:   i + 1,
                wallet: d.wallet,
                burned: fmtTokens(d.burned),
              }))
          );
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { burners, loading };
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
            <div className="s-label">{s.label || "\u00a0"}</div>
            {s.live ? (
              <div className="s-value s-live"><span className="dot-live"/>LIVE</div>
            ) : (
              <div className="s-value">{s.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

function FaqSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-section" id="sec-faq">
      <button className="faq-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>FAQ</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </button>
      {open && FAQS.map((item) => <FaqItem key={item.q} q={item.q} a={item.a}/>)}
    </div>
  );
}

// ── TOP BURNERS SECTION ──────────────────────────────────────────────────────
function TopBurnersSection() {
  const [expanded, setExpanded] = useState(false);
  const { burners, loading } = useTopBurners();

  const empty = !loading && burners.length === 0;

  const top5: BurnerEntry[] = burners.length > 0
    ? burners.slice(0, 5)
    : Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1, wallet: "—", burned: "—",
      }));

  const top6to20: BurnerEntry[] = burners.length > 0
    ? burners.slice(5, 20)
    : Array.from({ length: 15 }, (_, i) => ({
        rank: i + 6, wallet: "—", burned: "—",
      }));

  return (
    <section className="top-burners" id="sec-top-burners">
      <div className="tb-header">
        <div className="tb-label">[ LEADERBOARD ]</div>
        <h2 className="tb-title">TOP BURNERS</h2>
        <div className="tb-mantra">
          We see every burn. Every wallet. Every transaction.<br/>
          <span className="tb-mantra-strong">Top burners get airdropped.</span> The fire watches everyone who feeds it.
        </div>
      </div>

      <div className="tb-table-wrap">
        <table className="tb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>WALLET</th>
              <th>$BRIX BURNED</th>
              {/* <th>AIRDROP</th> */}
            </tr>
          </thead>
          <tbody>
            {top5.map((r) => (
              <tr key={r.rank} className="tb-row-top5">
                <td className="tb-rank">{String(r.rank).padStart(2, "0")}</td>
                <td className="tb-wallet">{r.wallet}</td>
                <td className="tb-burned">{r.burned}</td>
                {/* <td className="tb-reward">2 NFT</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expandable TOP 6-20 */}
      <button className="tb-expand-btn" onClick={() => setExpanded(o => !o)}>
        <span>TOP 20</span>
        <span className="tb-expand-icon">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="tb-table-wrap tb-table-secondary">
          <table className="tb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>WALLET</th>
                <th>$BRIX BURNED</th>
                {/* <th>AIRDROP</th> */}
              </tr>
            </thead>
            <tbody>
              {top6to20.map((r) => (
                <tr key={r.rank} className="tb-row-top20">
                  <td className="tb-rank">{String(r.rank).padStart(2, "0")}</td>
                  <td className="tb-wallet">{r.wallet}</td>
                  <td className="tb-burned">{r.burned}</td>
                  {/* <td className="tb-reward">1 NFT</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tb-footer">
        <span className="tb-footer-status">
          {loading ? "⏳ LOADING LEADERBOARD…" : empty ? "⚡ LEADERBOARD ACTIVATES AT TOKEN LAUNCH" : "🔴 LIVE LEADERBOARD"}
        </span>
        <span className="tb-footer-update">UPDATED EVERY 60 SEC</span>
      </div>
    </section>
  );
}

// ── SAFETY MODAL ─────────────────────────────────────────────────────────────
function SafetyModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  return (
    <div className="safety-overlay" onClick={onClose}>
      <div className="safety-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="safety-title">
        <div className="safety-title" id="safety-title">⚠ BEFORE YOU CONNECT</div>
        <ul className="safety-bullets">
          <li>Verify the URL is exactly <strong>brix-burns.com</strong></li>
          <li>We will never DM you first</li>
          <li>We will never ask for your seed phrase</li>
          <li>Only mint during announced phase windows</li>
          <li>Always confirm SOL / $BRIX amounts before approving</li>
        </ul>
        <div className="safety-actions">
          <button className="safety-btn safety-btn-primary" onClick={onAccept}>I understand — continue</button>
          <a href="/docs.html#safety" target="_blank" rel="noopener noreferrer" className="safety-btn safety-btn-link">Read full safety guide</a>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================
export default function BrixPage() {
  const wallet = useWallet();

  const [copied,    setCopied]    = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [counter,   setCounter]   = useState<"brix"|"percent"|"usd">("brix"); // DEFAULT: $BRIX BURNED
  const [flipping,  setFlipping]  = useState(false);
  const [safetyOpen,  setSafetyOpen]  = useState(false);
  const [safetyAcked, setSafetyAcked] = useState(false);

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

  useEffect(() => {
    try {
      if (localStorage.getItem("brix_safety_acked") === "1") setSafetyAcked(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (wallet.connected && !safetyAcked) setSafetyOpen(true);
  }, [wallet.connected, safetyAcked]);

  const acceptSafety = useCallback(() => {
    try { localStorage.setItem("brix_safety_acked", "1"); } catch {}
    setSafetyAcked(true);
    setSafetyOpen(false);
  }, []);

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
    navigator.clipboard.writeText("HCYUytzPBSRBJxemsyDEe9tHxg86cViV3Y2ZRny4pump");
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
  }, []);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const scrollTo = (id: string) => {
    if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      {/* == NAV ============================================================ */}
      <nav id="top">
        <button className="nav-logo" onClick={() => scrollTo("top")}>
          <Image src="/favicon.svg" alt="$BRIX" width={26} height={26} priority/>
          $BRIX
        </button>

        <div className="ca-badge" onClick={copy} title="HCYUytzPBSRBJxemsyDEe9tHxg86cViV3Y2ZRny4pump">
          HCYU…y4pump
          <button className="copy-btn" aria-label="Copy address">
            <CopyIcon done={copied}/>
          </button>
        </div>

        <ul className="nav-links">
          <li><button onClick={() => scrollTo("top")}>HOME</button></li>
          <li><button onClick={() => scrollTo("sec-mission")}>MISSION</button></li>
          <li><button className="nav-burn-link" onClick={() => scrollTo("sec-jackpot")}>BURN $BRIX</button></li>
          {/* <li><button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button></li> */}
          {/* <li><button className="nav-trixster" onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button></li> */}
          {/* <li><button className="nav-mint" onClick={() => scrollTo("sec-mint")}>MINT</button></li> */}
          <li><button className="nav-burners" onClick={() => scrollTo("sec-top-burners")}>TOP BURNERS</button></li>
          {/* <li><button onClick={() => scrollTo("sec-faq")}>FAQ</button></li> */}
          {/* <li><a href="/docs.html" target="_blank" rel="noopener noreferrer" className="nav-docs">DOCS</a></li> */}
        </ul>

        <div className="nav-right-group">
          <div className="price-inline">
            <span className="pi-num">{tracker.price}</span>
            <span className="pi-change" style={{ color: tracker.priceChangePositive ? "var(--green)" : "var(--orange)" }}>
              {tracker.priceChange24h}
            </span>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? "✕" : "☰"}
          </button>
          {menuOpen && (
            <div className="nav-dropdown">
              <button onClick={() => scrollTo("top")}>HOME</button>
              <button onClick={() => scrollTo("sec-mission")}>MISSION</button>
              <button className="dd-burn-link" onClick={() => { scrollTo("sec-jackpot"); setMenuOpen(false); }}>BURN $BRIX</button>
              {/* <button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button> */}
              {/* <button className="dd-trixster" onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button> */}
              {/* <button className="dd-mint" onClick={() => scrollTo("sec-mint")}>MINT</button> */}
              <button className="dd-burners" onClick={() => scrollTo("sec-top-burners")}>TOP BURNERS</button>
              {/* <button onClick={() => scrollTo("sec-faq")}>FAQ</button> */}
              {/* <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="dropdown-docs">DOCS</a> */}
            </div>
          )}
        </div>
      </nav>

      <StatsBar stats={liveStats}/>

      {/* == HERO =========================================================== */}
      <section className="hero" id="sec-mission">
        <div className="corner tl"/><div className="corner tr"/>
        <div className="corner bl"/><div className="corner br"/>

        <div className="hero-eyebrow">// A SOLANA TOKEN THAT BURNS ITSELF</div>

        <h1 className="hero-title">
          <span className="h-dollar">$</span><span className="h-brix">BRIX</span>{" "}
          <span className="h-burns">BURNS</span><span className="h-dot">.</span>
        </h1>

        <div className="mantra">
          THE GOAL IS <span className="m-zero">ZERO</span>.{MANTRA_TAIL && <> {MANTRA_TAIL}</>}
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
            <div className="burn-progress-target" title="Target: 90%"/>
          </div>
          <div className="burn-progress-labels">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span className="target-label">{TARGET_PERCENT}% TARGET</span>
          </div>
        </div>
      </div>

      <div className="tagline">
        <div className="tl-cta">
          <a href={GET_BRIX_LINK} className="btn btn-primary" title="Token Not Live Yet">GET $BRIX &nbsp;›</a>
          <a href={X_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            FOLLOW &nbsp;<Image src="/logox.svg" alt="X" width={14} height={14} style={{verticalAlign:"middle",opacity:.85}}/>
          </a>
        </div>
        <div className="tl-sub">1 BILLION TOKENS. <span className="tw">3333</span> NFTS. ONE MISSION.</div>
      </div>

      {/* == PILLARS ======================================================== */}
      <div className="pillars">
        <div className="pillar align-left">
          <div className="pc tl"/>
          <div className="pillar-tag">[ BURN ]</div>
          <div className="pillar-title p-burn">BURN THE SUPPLY.</div>
          <div className="pillar-body">Every mint destroys $BRIX. Every sale destroys $BRIX. The supply only moves one way.</div>
        </div>
        <div className="pillar align-center">
          <div className="pillar-tag">[ FUEL ]</div>
          <div className="pillar-title p-fuel">MINT THE FIRE.</div>
          <div className="pillar-body">TRIXSTER NFTs are the mechanism. Every mint feeds the burn and the reward pool.</div>
        </div>
        <div className="pillar align-right">
          <div className="pc br"/>
          <div className="pillar-tag">[ ZERO ]</div>
          <div className="pillar-title p-zero">REACH ZERO.</div>
          <div className="pillar-body">90% of supply destroyed is the target. Continuous burn outlives the mint event.</div>
        </div>
      </div>

      <div className="numbers-row">
        <div className="number-cell">
          <div className="big-num n-orange">90%</div>
          <div className="num-label">BURN TARGET</div>
        </div>
        <div className="number-cell">
          <div className="big-num n-white">3,333</div>
          <div className="num-label">NFTS</div>
        </div>
        <div className="number-cell" id="sec-jackpot" style={{ scrollMarginTop: "200px" }}>
          <div className="big-num n-gold">0</div>
          <div className="num-label">IS THE GOAL</div>
        </div>
      </div>

      <div className="cta-row cta-row--centered">
        <BurnButton tokenMint={TOKEN_MINT} />
      </div>

      {/* == BOTTOM GRID ==================================================== */}
      <div className="bottom-grid" style={{ display: "none" }}>

        <div className="bottom-card" id="sec-how">
          <h2 className="card-title">[ HOW IT WORKS ]</h2>
          {[
            ["01","BUY $BRIX","Get $BRIX on Pump.fun or Raydium."],
            ["02","BURN TO MINT","Burn $BRIX + pay SOL to mint a TRIXSTER."],
            ["03","HOLD & REVEAL","Trade or hold through the reveal."],
            ["04","COLLECT REWARDS","Share of pool weighted by tier."],
            ["05","WIN JACKPOTS","30 jackpot winners across 4 phases."],
          ].map(([n,t,s]) => (
            <div className="how-step" key={n}>
              <span className="step-num">{n}</span>
              <div>
                <div className="step-title">{t}</div>
                <div className="step-sub">{s}</div>
              </div>
            </div>
          ))}
          <div className="simple-line">EVERY STEP FEEDS THE BURN.</div>
          <div className="card-footer-btn">
            <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="btn-details">FULL MECHANICS <span>›</span></a>
          </div>
        </div>

        <div className="bottom-card" id="sec-trixster">
          <h2 className="card-title">[ TRIXSTER COLLECTION ]</h2>
          <div className="nft-preview">
            <Image src="/nft_preview.png" alt="Trixster NFT" width={160} height={160}/>
          </div>
          <div className="nft-desc">
            <strong>3,333 UNIQUE NFTS</strong>
            FORGED IN FIRE, FUELED BY $BRIX.
          </div>
          <div className="nft-tagline">// TIER REWARD WEIGHTS</div>
          <table className="tier-table">
            <tbody>
              <tr className="tier-legendary">
                <td className="tier-name">LEGENDARY</td>
                <td className="tier-count">82</td>
                <td className="tier-weight">8x</td>
              </tr>
              <tr className="tier-epic">
                <td className="tier-name">EPIC</td>
                <td className="tier-count">259</td>
                <td className="tier-weight">5x</td>
              </tr>
              <tr className="tier-golden">
                <td className="tier-name">GOLDEN</td>
                <td className="tier-count">331</td>
                <td className="tier-weight">3x</td>
              </tr>
              <tr className="tier-rare">
                <td className="tier-name">RARE</td>
                <td className="tier-count">709</td>
                <td className="tier-weight">1x</td>
              </tr>
              <tr className="tier-uncommon">
                <td className="tier-name">UNCOMMON</td>
                <td className="tier-count">1952</td>
                <td className="tier-weight">jackpot</td>
              </tr>
            </tbody>
          </table>
          <a href="/docs.html#rewards" target="_blank" rel="noopener noreferrer" className="btn-sm">REWARD FORMULA <span>›</span></a>
        </div>

        <div className="bottom-card" id="sec-mint">
          <h2 className="card-title">[ MINT BOX ]</h2>
          <div className="mint-status-label">MINTING</div>
          <div className="coming-soon">COMING SOON</div>
          <div className="progress-track"><div className="progress-fill"/></div>
          <div className="progress-label">0 / 3333</div>
          <div className="mint-price-box">
            <div className="mint-price-main">F1 PRICE &nbsp;<strong>0.05 SOL</strong><span style={{ color: "#f5c400", opacity: 0.8, fontSize: ".6rem" }}>&nbsp;/ 0 SOL EARLY ACCESS</span></div>
            <div className="mint-price-sub">REQUIRES 25K $BRIX BURN</div>
          </div>
          <div className="phase-rows">
            {[
              ["F1","0/690","25K $BRIX","SOON"],
              ["F2","0/750","50K $BRIX","—"],
              ["F3","0/850","100K $BRIX","—"],
              ["F4","0/1043","150K $BRIX","—"],
            ].map(([name, prog, burn, status]) => (
              <div className="phase-row" key={name}>
                <span className="ph-name">{name}</span>
                <span className="ph-nfts">{prog}</span>
                <div className="ph-bar-wrap"><div className="ph-bar-fill"/></div>
                <span className="ph-burn">{burn}</span>
                <span className="ph-status">{status}</span>
              </div>
            ))}
          </div>
          <div className="reward-pool-box">
            <div className="reward-pool-label">REWARD POOL BALANCE</div>
            <div className="reward-pool-value">0.00 SOL</div>
            <div className="reward-pool-sub">LIVE · UPDATED EACH BLOCK</div>
          </div>

          <div className="safety-hint">
            ⚠ <a href="/docs.html#safety" target="_blank" rel="noopener noreferrer">READ SAFETY GUIDE</a> BEFORE MINTING
          </div>

            <div className="mint-button-slot">
              <div className="coming-soon" style={{ fontSize: "1.4rem", padding: "1px 0", opacity: 0.5 }}>MINT NOT ACTIVE.</div>
            </div>
        </div>

      </div>

      {/* == TOP BURNERS =================================================== */}
      <TopBurnersSection/>

      {/* == FAQ ============================================================ */}
      {/* <FaqSection/> */}

      <footer>
        <div className="footer-line">// THE GOAL IS ZERO</div>
        <div className="footer-brand">$BRIX BURNS</div>
        <div className="footer-disclaimer">
          Nothing on this site constitutes financial advice. Cryptocurrency and NFT markets involve risk. Burns are permanent.
        </div>
        <div className="footer-corners">
          <div className="f-corner fl"/>
          <div className="f-corner fr"/>
        </div>
      </footer>

      {safetyOpen && <SafetyModal onAccept={acceptSafety} onClose={() => setSafetyOpen(false)}/>}

    </>
  );
}
