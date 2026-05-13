// Minimal Next.js page (App Router style)
// Mission-driven layout: burn is the protagonist, NFTs are the mechanism.
//
// ═══════════════════════════════════════════════════════════════════════════
// PRE-LAUNCH MODE — replace these constants when token goes live:
//   1. BRIX_BURNED / BURN_PERCENT / BURN_USD → wire to live RPC tracker
//   2. STATS array → replace live=true / soon dot, real numbers
//   3. CA "BRiXc0ntr4ct" → real contract address
//   4. GET_BRIX_LINK → https://pump.fun/coin/<MINT_ADDRESS>
//   5. MANTRA_TAIL → flip from "EVERY MINT GETS US CLOSER." to mint-phase tail,
//      then to "" after mint ends (only "THE GOAL IS ZERO." remains)
//   6. TOP_BURNERS_DATA → wire to live leaderboard backend
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";

import WalletContextProvider from "./WalletContextProvider";
import MintButton from "./MintButton";

// ── MODULAR MANTRA ───────────────────────────────────────────────────────────
// Change this single constant to update the mantra everywhere on the page.
// Post-mint: set to "" to display only "THE GOAL IS ZERO." (no tail).
const MANTRA_TAIL = "EVERY MINT GETS US CLOSER.";

// ── BURN COUNTER (placeholder, wire to live tracker post-launch) ─────────────
const BRIX_BURNED   = "00,000,000";       // tokens
const BURN_PERCENT  = "00.00%";           // of supply
const BURN_USD      = "$00,000.00";       // USD value
const TARGET_PERCENT = 90;

// ── EXTERNAL LINKS ───────────────────────────────────────────────────────────
const GET_BRIX_LINK = "#";  // → "https://pump.fun/coin/<MINT_ADDRESS>" at launch
const X_LINK        = "https://x.com/BRIX_burns";

// ── STATS BAR ────────────────────────────────────────────────────────────────
const stats = [
  { label: "PRICE",        value: "$0.000000"     },
  { label: "MARKET CAP",   value: "$000,000"      },
  { label: "SUPPLY",       value: "1,000,000,000" },
  { label: "BURNED",       value: "00.00%"        },
  { label: "TARGET BURN",  value: "90%"           },
  { label: "HOLDERS",      value: "000"           },
  { label: "STATUS",       value: "",  live: true },
];

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
    a: "Four phases (F1–F4). Each phase requires burning a set amount of $BRIX to access the mint, then paying 0.05–0.18 SOL per NFT (price increases per phase). A SOL-only alternative path exists for users without $BRIX — it triggers buyback-and-burn automatically.",
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

// ── TOP BURNERS — placeholder data, wire to live backend ─────────────────────
type BurnerEntry = { rank: number; wallet: string; burned: string; reward: string };
const TOP_BURNERS_DATA: BurnerEntry[] = [
  // Empty pre-launch; populate from live leaderboard script after token launch
];

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
function StatsBar() {
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
          <div className="stat-item" key={i}>
            <div className="s-label">{s.label || "\u00a0"}</div>
            {(s as {live?: boolean}).live ? (
              <div className="s-value s-live"><span className="dot-red"/>SOON</div>
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
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
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
      <button className="faq-header" onClick={() => setOpen(o => !o)}>
        <span>FAQ</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </button>
      {open && FAQS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a}/>)}
    </div>
  );
}

// ── TOP BURNERS SECTION ──────────────────────────────────────────────────────
function TopBurnersSection() {
  const [expanded, setExpanded] = useState(false);

  // Placeholder rows — replace with live leaderboard data after token launch
  const top5: BurnerEntry[] = TOP_BURNERS_DATA.length > 0
    ? TOP_BURNERS_DATA.slice(0, 5)
    : Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1, wallet: "—", burned: "—", reward: i < 5 ? "2 NFT" : "1 NFT",
      }));

  const top6to20: BurnerEntry[] = TOP_BURNERS_DATA.length > 0
    ? TOP_BURNERS_DATA.slice(5, 20)
    : Array.from({ length: 15 }, (_, i) => ({
        rank: i + 6, wallet: "—", burned: "—", reward: "1 NFT",
      }));

  return (
    <section className="top-burners" id="sec-top-burners">
      <div className="tb-header">
        <div className="tb-label">[ LEADERBOARD ]</div>
        <div className="tb-title">TOP BURNERS</div>
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
              <th>AIRDROP</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((r, i) => (
              <tr key={i} className="tb-row-top5">
                <td className="tb-rank">{String(r.rank).padStart(2, "0")}</td>
                <td className="tb-wallet">{r.wallet}</td>
                <td className="tb-burned">{r.burned}</td>
                <td className="tb-reward">2 NFT</td>
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
                <th>AIRDROP</th>
              </tr>
            </thead>
            <tbody>
              {top6to20.map((r, i) => (
                <tr key={i} className="tb-row-top20">
                  <td className="tb-rank">{String(r.rank).padStart(2, "0")}</td>
                  <td className="tb-wallet">{r.wallet}</td>
                  <td className="tb-burned">{r.burned}</td>
                  <td className="tb-reward">1 NFT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tb-footer">
        <span className="tb-footer-status">⚡ LEADERBOARD ACTIVATES AT TOKEN LAUNCH</span>
        <span className="tb-footer-update">UPDATED EVERY 30 MIN</span>
      </div>
    </section>
  );
}

// ── SAFETY MODAL ─────────────────────────────────────────────────────────────
function SafetyModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  return (
    <div className="safety-overlay" onClick={onClose}>
      <div className="safety-modal" onClick={e => e.stopPropagation()}>
        <div className="safety-title">⚠ BEFORE YOU CONNECT</div>
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function BrixPage() {
  const [copied,    setCopied]    = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [counter,   setCounter]   = useState<"brix"|"percent"|"usd">("brix"); // DEFAULT: $BRIX BURNED
  const [flipping,  setFlipping]  = useState(false);
  const [safetyOpen,  setSafetyOpen]  = useState(false);
  const [safetyAcked, setSafetyAcked] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("brix_safety_acked") === "1") setSafetyAcked(true);
    } catch {}
  }, []);

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
    navigator.clipboard.writeText("BRiXc0ntr4ct");
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
    <WalletContextProvider>
      <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;700;900&family=Orbitron:wght@700;900&display=swap');

        :root {
          --bg:        #0a0a00;
          --surface:   #111100;
          --border:    #2a2a00;
          --gold:      #f5c400;
          --green:     #39ff14;
          --orange:    #ff4b1f;
          --white:     #e8e8e0;
          --dim:       #888870;
          --font-mono: 'Share Tech Mono', monospace;
          --font-cond: 'Barlow Condensed', sans-serif;
          --font-orb:  'Orbitron', sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: var(--bg); color: var(--white); font-family: var(--font-mono); overflow-x: hidden; }
        body::before { content: ''; position: fixed; inset: 0; z-index: 9999; background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px); pointer-events: none; }
        body::after { content: ''; position: fixed; inset: 0; z-index: 9998; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; opacity:.4; }

        /* ══ NAV ══ */
        nav {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 12px; border-bottom: 1px solid var(--border);
          background: rgba(0,0,0,.75); backdrop-filter: blur(4px);
          position: sticky; top: 0; z-index: 200;
        }
        .nav-logo { display: flex; align-items: center; gap: 5px; font-family: var(--font-orb); font-size: 1.05rem; font-weight: 900; color: var(--gold); letter-spacing: .04em; text-decoration: none; white-space: nowrap; cursor: pointer; background: none; border: none; }
        .nav-logo img { width: 26px; height: 26px; object-fit: contain; }

        .ca-badge { display: flex; align-items: center; gap: 5px; border: 1px solid var(--border); padding: 3px 7px; border-radius: 4px; font-size: .6rem; color: var(--dim); cursor: pointer; transition: border-color .2s; white-space: nowrap; }
        .ca-badge:hover { border-color: var(--gold); }
        .copy-btn { background: transparent; border: none; color: var(--dim); padding: 1px 2px; cursor: pointer; line-height: 0; display: flex; align-items: center; transition: color .2s; }
        .copy-btn:hover { color: var(--gold); }

        .nav-links { display: flex; gap: 16px; list-style: none; margin-left: auto; }
        .nav-links a, .nav-links button {
          color: var(--dim); text-decoration: none; background: none; border: none;
          font-family: var(--font-mono); font-size: .68rem; letter-spacing: .12em;
          cursor: pointer; transition: color .2s; padding: 0;
        }
        .nav-links a:hover, .nav-links button:hover { color: var(--white); }
        .nav-links .nav-trixster { color: var(--gold); }
        .nav-links .nav-trixster:hover { color: var(--white); }
        .nav-links .nav-mint { color: var(--green); font-weight: bold; }
        .nav-links .nav-mint:hover { color: var(--white); }
        .nav-links .nav-burners { color: var(--orange); font-weight: bold; }
        .nav-links .nav-burners:hover { color: var(--white); }

        .nav-right-group { display: flex; align-items: center; gap: 8px; margin-left: auto; position: relative; }
        @media (min-width: 641px) { .nav-right-group { margin-left: 0; } }

        .price-inline { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
        .pi-num    { font-family: var(--font-orb); font-size: .85rem; color: var(--gold); }
        .pi-change { font-size: .56rem; color: var(--green); }

        .hamburger { background: none; border: 1px solid var(--border); color: var(--white); cursor: pointer; padding: 3px 7px; font-size: .85rem; display: none; transition: border-color .2s; flex-shrink: 0; }
        .hamburger:hover { border-color: var(--gold); color: var(--gold); }

        .nav-dropdown { position: absolute; top: calc(100% + 4px); right: 0; background: rgba(8,8,0,.97); border: 1px solid var(--border); min-width: 160px; z-index: 300; }
        .nav-dropdown button, .nav-dropdown a.dropdown-docs {
          display: block; width: 100%; text-align: left; padding: 10px 16px;
          color: var(--dim); background: none; border: none; border-bottom: 1px solid var(--border);
          font-family: var(--font-mono); font-size: .7rem; letter-spacing: .12em;
          cursor: pointer; transition: color .2s, background .2s; text-decoration: none;
        }
        .nav-dropdown button:last-child, .nav-dropdown a.dropdown-docs:last-child { border-bottom: none; }
        .nav-dropdown button:hover, .nav-dropdown a.dropdown-docs:hover { color: var(--gold); background: rgba(245,196,0,.05); }
        .nav-dropdown .dd-mint    { color: var(--green); }
        .nav-dropdown .dd-burners { color: var(--orange); }

        @media (max-width: 640px) {
          .nav-links { display: none; }
          .hamburger { display: block; }
          .nav-logo { font-size: .9rem; }
          .nav-logo img { width: 22px; height: 22px; }
          .pi-num    { font-size: .78rem; }
          .pi-change { font-size: .52rem; }
          nav { padding: 6px 8px; gap: 7px; }
        }
        @media (min-width: 641px) {
          .hamburger { display: none; }
          .nav-dropdown { display: none !important; }
        }

        /* ══ STATS BAR ══ */
        .stats-outer { overflow: hidden; border-bottom: 1px solid var(--border); background: var(--surface); position: relative; }
        .stats-outer::before, .stats-outer::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40px; z-index: 2; pointer-events: none; }
        .stats-outer::before { left: 0;  background: linear-gradient(90deg, var(--surface), transparent); }
        .stats-outer::after  { right: 0; background: linear-gradient(-90deg, var(--surface), transparent); }
        .stats-track { display: flex; animation: scroll-stats 28s linear infinite; width: max-content; }
        @keyframes scroll-stats { 0% { transform: translateX(0); } 100% { transform: translateX(-25%); } }
        .stat-item { flex: 0 0 auto; text-align: center; padding: 8px 22px; border-right: 1px solid var(--border); }
        .s-label { font-size: .55rem; color: var(--dim); letter-spacing: .1em; }
        .s-value { font-family: var(--font-orb); font-size: .78rem; color: var(--white); margin-top: 2px; white-space: nowrap; }
        .s-live  { display: flex; align-items: center; gap: 5px; color: #ff3333 !important; }
        .dot-red { width: 6px; height: 6px; border-radius: 50%; background: #ff3333; flex-shrink: 0; animation: pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }

        /* ══ LAUNCH BANNER ══ */
        .launch-banner {
          text-align: center; padding: 8px 24px;
          font-family: var(--font-mono); font-size: 1.5rem;
          letter-spacing: .25em; color: var(--green);
          border-bottom: 1px solid var(--border);
          animation: blink-banner 1.4s ease-in-out infinite;
          background: rgba(57,255,20,.03);
        }
        @keyframes blink-banner { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

        /* ══ HERO ══ */
        .hero { padding: 70px 24px 30px; text-align: center; position: relative; }
        .hero-eyebrow { font-family: var(--font-mono); font-size: .7rem; letter-spacing: .3em; color: var(--orange); margin-bottom: 18px; }
        .hero-title {
          font-family: var(--font-cond);
          font-size: clamp(3.2rem, 11vw, 8rem);
          font-weight: 900; line-height: .9;
          letter-spacing: -.02em; text-transform: uppercase;
        }
        .h-dollar { color: var(--white); }
        .h-brix   { color: var(--gold); }
        .h-burns  { color: var(--white); }
        .h-dot    { color: var(--orange); }

        .mantra {
          margin: 26px auto 0;
          font-family: var(--font-mono);
          font-size: clamp(.85rem, 2.2vw, 1.05rem);
          letter-spacing: .12em;
          color: var(--gold);
          padding: 12px 24px;
          border-top: 1px solid rgba(245,196,0,.2);
          border-bottom: 1px solid rgba(245,196,0,.2);
          display: inline-block;
          text-transform: uppercase;
          background: rgba(245,196,0,.03);
        }
        .mantra .m-zero { color: var(--orange); }

        .corner { position: absolute; width: 18px; height: 18px; border-color: var(--orange); border-style: solid; }
        .corner.tl { top: 12px; left: 12px;  border-width: 2px 0 0 2px; }
        .corner.tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
        .corner.bl { bottom: 12px; left: 12px;  border-width: 0 0 2px 2px; }
        .corner.br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }

        /* ══ BURN COUNTER (tri-state) ══ */
        .burn-section {
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 24px 24px; gap: 18px;
        }
        .burn-tabs { display: flex; border: 1px solid var(--border); flex-wrap: wrap; justify-content: center; }
        .burn-tab {
          padding: 9px 20px; font-family: var(--font-mono); font-size: .68rem;
          letter-spacing: .1em; cursor: pointer; border: none; background: transparent;
          color: var(--dim); transition: color .2s, background .2s;
          text-transform: uppercase; border-right: 1px solid var(--border);
        }
        .burn-tab:last-child { border-right: none; }
        .burn-tab.active-brix    { color: var(--orange); background: rgba(255,75,31,.07); }
        .burn-tab.active-percent { color: var(--gold);   background: rgba(245,196,0,.07); }
        .burn-tab.active-usd     { color: var(--green);  background: rgba(57,255,20,.07); }
        .burn-tab:not([class*="active"]):hover { color: var(--white); }

        .burn-box {
          border-width: 1px; border-style: solid;
          padding: 26px 48px; min-width: min(420px, 90vw);
          text-align: center; transition: border-color .3s;
        }
        .burn-box.brix-mode    { border-color: var(--orange); box-shadow: 0 0 18px rgba(255,75,31,.15); }
        .burn-box.percent-mode { border-color: var(--gold);   box-shadow: 0 0 18px rgba(245,196,0,.15); }
        .burn-box.usd-mode     { border-color: var(--green);  box-shadow: 0 0 18px rgba(57,255,20,.15); }
        .burn-flip { transition: transform .28s ease, opacity .28s ease; }
        .burn-flip.flipping { transform: rotateX(80deg); opacity: 0; }
        .burn-value {
          font-family: var(--font-orb);
          font-size: clamp(2rem, 5.5vw, 3.2rem);
          letter-spacing: .02em; line-height: 1;
        }
        .burn-value.brix    { color: var(--orange); animation: glow-orange 2s ease-in-out infinite; }
        .burn-value.percent { color: var(--gold);   animation: glow-gold 2s ease-in-out infinite; }
        .burn-value.usd     { color: var(--green);  animation: glow-green 2s ease-in-out infinite; }
        @keyframes glow-orange { 0%,100% { text-shadow: 0 0 8px rgba(255,75,31,.4), 0 0 20px rgba(255,75,31,.2); } 50% { text-shadow: 0 0 16px rgba(255,75,31,.9), 0 0 40px rgba(255,75,31,.5), 0 0 60px rgba(255,75,31,.2); } }
        @keyframes glow-gold   { 0%,100% { text-shadow: 0 0 8px rgba(245,196,0,.4), 0 0 20px rgba(245,196,0,.2); } 50% { text-shadow: 0 0 16px rgba(245,196,0,.9), 0 0 40px rgba(245,196,0,.5), 0 0 60px rgba(245,196,0,.2); } }
        @keyframes glow-green  { 0%,100% { text-shadow: 0 0 8px rgba(57,255,20,.4), 0 0 20px rgba(57,255,20,.2); } 50% { text-shadow: 0 0 16px rgba(57,255,20,.9), 0 0 40px rgba(57,255,20,.5), 0 0 60px rgba(57,255,20,.2); } }

        .burn-progress-wrap { width: min(420px, 90vw); }
        .burn-progress-track { height: 6px; background: var(--surface); border: 1px solid var(--border); position: relative; overflow: hidden; }
        .burn-progress-fill { position: absolute; inset: 0 auto 0 0; width: 0%; background: linear-gradient(90deg, var(--orange), var(--gold)); box-shadow: 0 0 10px rgba(245,196,0,.5); transition: width 1.5s ease; }
        .burn-progress-target { position: absolute; top: -3px; bottom: -3px; left: 90%; width: 2px; background: var(--green); box-shadow: 0 0 6px var(--green); }
        .burn-progress-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: .55rem; color: var(--dim); letter-spacing: .12em; }
        .burn-progress-labels .target-label { color: var(--green); }

        /* ══ TAGLINE / CTA ══ */
        .tagline { text-align: center; padding: 28px 24px 8px; font-size: .8rem; letter-spacing: .12em; line-height: 2; }
        .tl-cta  { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin: 14px 0; }
        .tl-sub  { color: var(--orange); padding-top: 10px; font-size: .75rem; letter-spacing: .15em; }
        .tl-sub .tw { color: var(--white); }

        .btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 12px 30px;
          font-family: var(--font-cond); font-size: .95rem; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase;
          cursor: pointer; border: none; text-decoration: none;
          transition: transform .15s, box-shadow .15s;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-primary { background: var(--gold); color: #000; box-shadow: 0 0 0 1px var(--gold); }
        .btn-primary:hover { box-shadow: 0 0 20px var(--gold); }
        .btn-outline { background: transparent; color: var(--white); border: 1px solid var(--white); }
        .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
        .btn-danger { background: var(--orange); color: #000; box-shadow: 0 0 0 1px var(--orange); }
        .btn-danger:hover { box-shadow: 0 0 20px var(--orange); }

        /* ══ PILLARS ══ */
        .pillars { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--border); margin: 30px 24px 0; }
        @media (max-width: 640px) { .pillars { grid-template-columns: 1fr; } }
        .pillar { background: var(--bg); padding: 28px 24px; position: relative; }
        .pillar.align-left   { text-align: left; }
        .pillar.align-center { text-align: center; }
        .pillar.align-right  { text-align: right; }
        .pc { position: absolute; width: 10px; height: 10px; border-color: var(--orange); border-style: solid; }
        .pc.tl { top:0;    left:0;  border-width: 2px 0 0 2px; }
        .pc.br { bottom:0; right:0; border-width: 0 2px 2px 0; }
        .pillar-tag   { font-size: .8rem; color: var(--dim); letter-spacing: .15em; margin-bottom: 10px; }
        .pillar-title { font-family: var(--font-cond); font-size: 1.6rem; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
        .p-burn { color: var(--orange); }
        .p-fuel { color: var(--gold); }
        .p-zero { color: var(--white); }
        .pillar-body  { font-size: .72rem; color: var(--dim); line-height: 1.6; }

        /* ══ NUMBERS ══ */
        .numbers-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--border); margin: 24px 24px 0; }
        @media (max-width: 640px) { .numbers-row { grid-template-columns: 1fr; } }
        .number-cell { background: var(--surface); padding: 28px 20px; text-align: center; }
        .big-num { font-family: var(--font-orb); font-size: clamp(2.4rem,6vw,3.5rem); font-weight: 900; letter-spacing: .04em; }
        .n-orange { color: var(--orange); }
        .n-white  { color: var(--white); }
        .n-gold   { color: var(--gold); }
        .num-label { font-size: .65rem; color: var(--dim); letter-spacing: .2em; margin-top: 6px; }

        .cta-row { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; padding: 36px 24px; }

        /* ══ BOTTOM GRID ══ */
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: var(--border); margin: 0 24px; }
        @media (max-width: 768px) { .bottom-grid { grid-template-columns: 1fr; } }
        .bottom-card { background: var(--surface); padding: 28px 24px; position: relative; display: flex; flex-direction: column; }
        .card-title { font-size: .75rem; color: var(--orange); letter-spacing: .2em; margin-bottom: 18px; text-transform: uppercase; }

        .how-step { display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start; }
        .step-num  { font-family: var(--font-orb); font-size: .7rem; color: var(--gold); min-width: 22px; }
        .step-title { font-size: .75rem; color: var(--white); font-weight: bold; text-transform: uppercase; letter-spacing: .08em; }
        .step-sub   { font-size: .68rem; color: var(--dim); }
        .simple-line { margin-top: 18px; font-family: var(--font-cond); font-size: 1.3rem; font-weight: 900; color: var(--orange); text-transform: uppercase; }

        .card-footer-btn { margin-top: auto; padding-top: 16px; display: flex; justify-content: flex-end; }
        .btn-details, .btn-sm {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 10px 14px;
          background: transparent; border: 1px solid var(--dim);
          color: var(--white); font-family: var(--font-mono); font-size: .75rem;
          cursor: pointer; transition: border-color .2s, color .2s; margin-top: auto;
          text-decoration: none;
        }
        .btn-details:hover, .btn-sm:hover { border-color: var(--gold); color: var(--gold); }

        .nft-preview { border: 3px solid rgba(255,75,31,.9); display: flex; align-items: center; justify-content: center; height: 160px; margin-bottom: 12px; background: #fab700; overflow: hidden; }
        .nft-preview img { width: 130%; height: 130%; object-fit: contain; }
        .nft-desc { font-size: .7rem; color: var(--dim); text-align: center; margin-bottom: 14px; }
        .nft-desc strong { color: var(--white); display: block; margin-bottom: 4px; }
        .nft-tagline { font-size: .62rem; color: var(--orange); text-align: center; margin-bottom: 12px; letter-spacing: .1em; }

        .tier-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .tier-table td { font-size: .62rem; padding: 4px 6px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); }
        .tier-table tr:last-child td { border-bottom: none; }
        .tier-name { color: var(--dim); }
        .tier-count { color: var(--white); text-align: center; }
        .tier-weight { color: var(--gold); text-align: right; }
        .tier-legendary .tier-name { color: #ff6b35; }
        .tier-epic      .tier-name { color: #a855f7; }
        .tier-golden    .tier-name { color: var(--gold); }
        .tier-rare      .tier-name { color: #60a5fa; }

        /* MINT BOX */
        .mint-status-label { font-size: .6rem; color: var(--dim); letter-spacing: .15em; margin-bottom: 4px; }
        .coming-soon { font-family: var(--font-orb); font-size: 1rem; color: var(--gold); margin-bottom: 10px; }
        .progress-track { background: var(--border); height: 6px; margin-bottom: 5px; overflow: hidden; }
        .progress-fill  { height: 100%; width: 0%; background: var(--green); box-shadow: 0 0 8px var(--green); }
        .progress-label { font-size: .6rem; color: var(--dim); text-align: right; margin-bottom: 12px; }

        .mint-price-box { border: 1px solid var(--border); padding: 8px 12px; margin-bottom: 12px; line-height: 1.6; }
        .mint-price-main { font-size: .7rem; color: var(--dim); }
        .mint-price-main strong { color: var(--white); font-size: .78rem; }
        .mint-price-sub  { font-size: .62rem; color: var(--dim); }

        .reward-pool-box { border: 1px solid var(--border); padding: 8px 12px; margin-bottom: 12px; line-height: 1.6; background: rgba(245,196,0,.03); }
        .reward-pool-label { font-size: .62rem; color: var(--dim); letter-spacing: .08em; margin-bottom: 2px; }
        .reward-pool-value { font-family: var(--font-orb); font-size: 1rem; color: var(--gold); letter-spacing: .04em; }
        .reward-pool-sub { font-size: .58rem; color: var(--dim); margin-top: 1px; }

        .phase-rows { margin-bottom: 14px; }
        .phase-row { display: grid; grid-template-columns: 22px 44px 1fr 60px 34px; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border); }
        .phase-row:last-child { border-bottom: none; }
        .ph-name  { font-family: var(--font-orb); font-size: .58rem; color: var(--dim); }
        .ph-nfts  { font-size: .6rem; color: var(--white); white-space: nowrap; }
        .ph-bar-wrap { height: 4px; background: var(--border); overflow: hidden; }
        .ph-bar-fill { height: 100%; width: 0%; background: var(--green); }
        .ph-burn  { font-size: .58rem; color: var(--gold); text-align: right; white-space: nowrap; }
        .ph-status { font-size: .55rem; color: var(--green); text-align: right; letter-spacing: .06em; }

        .mint-button-slot { margin-top: auto; }
        .btn-connect-glow {
          width: 100%; padding: 13px; margin-top: auto;
          background: transparent; border: 1px solid var(--green);
          color: var(--green); font-family: var(--font-mono); font-size: .82rem;
          font-weight: bold; letter-spacing: .12em; cursor: pointer;
          animation: glow-btn 2s ease-in-out infinite;
          transition: background .2s, color .2s;
        }
        .btn-connect-glow:hover { background: var(--green); color: #000; animation: none; }
        .btn-connect-glow:disabled { border-color: var(--border); color: var(--dim); animation: none; cursor: not-allowed; box-shadow: none; }
        @keyframes glow-btn { 0%,100% { box-shadow: 0 0 4px rgba(57,255,20,.3); border-color: rgba(57,255,20,.7); } 50% { box-shadow: 0 0 16px rgba(57,255,20,.8), 0 0 30px rgba(57,255,20,.3); border-color: var(--green); } }

        .safety-hint { font-size: .58rem; color: var(--orange); text-align: center; padding: 6px 0 10px; letter-spacing: .08em; line-height: 1.5; }
        .safety-hint a { color: var(--gold); text-decoration: none; }
        .safety-hint a:hover { text-decoration: underline; }

        /* ══ TOP BURNERS SECTION ══ */
        .top-burners {
          margin: 50px 24px 0;
          border: 1px solid var(--orange);
          background: linear-gradient(180deg, rgba(255,75,31,0.03), rgba(255,75,31,0.01));
          padding: 30px 28px;
          position: relative;
        }
        .top-burners::before, .top-burners::after {
          content: ''; position: absolute; width: 16px; height: 16px;
          border-color: var(--orange); border-style: solid;
        }
        .top-burners::before { top: 8px; left: 8px;  border-width: 2px 0 0 2px; }
        .top-burners::after  { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; }

        .tb-header { text-align: center; margin-bottom: 26px; }
        .tb-label {
          font-family: var(--font-mono); font-size: .7rem;
          color: var(--orange); letter-spacing: .25em; margin-bottom: 10px;
        }
        .tb-title {
          font-family: var(--font-cond);
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 900; color: var(--white);
          letter-spacing: .04em; line-height: 1;
          margin-bottom: 16px; text-transform: uppercase;
        }
        .tb-mantra {
          font-family: var(--font-mono); font-size: .72rem;
          color: var(--dim); letter-spacing: .08em;
          line-height: 1.9; max-width: 580px; margin: 0 auto;
        }
        .tb-mantra-strong { color: var(--orange); font-weight: bold; }

        .tb-table-wrap { overflow-x: auto; }
        .tb-table-secondary { margin-top: 0; }

        .tb-table {
          width: 100%; border-collapse: collapse;
          font-family: var(--font-mono); font-size: .7rem;
        }
        .tb-table thead tr { border-bottom: 1px solid var(--border); }
        .tb-table th {
          padding: 10px 12px; text-align: left;
          font-size: .55rem; letter-spacing: .15em;
          color: var(--orange); font-weight: bold;
        }
        .tb-table td {
          padding: 10px 12px; border-bottom: 1px solid var(--border);
          color: var(--dim);
        }
        .tb-table tr:last-child td { border-bottom: none; }
        .tb-rank { font-family: var(--font-orb); color: var(--gold); width: 40px; }
        .tb-wallet { color: var(--white); font-family: var(--font-mono); }
        .tb-burned { color: var(--orange); text-align: right; }
        .tb-reward { color: var(--gold); text-align: right; font-weight: bold; }

        .tb-row-top5 .tb-rank   { color: var(--orange); }
        .tb-row-top5 .tb-burned { color: var(--orange); font-weight: bold; }
        .tb-row-top20 .tb-rank  { color: var(--gold); }
        .tb-row-top20 td        { color: var(--gold); opacity: .85; }

        /* expandable button */
        .tb-expand-btn {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 12px 12px;
          background: none; border: none;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          font-family: var(--font-mono); font-size: .68rem;
          color: var(--gold); letter-spacing: .18em;
          cursor: pointer; transition: background .2s, color .2s;
          margin-top: 6px;
        }
        .tb-expand-btn:hover { background: rgba(245,196,0,.04); color: var(--white); }
        .tb-expand-icon { font-size: 1rem; color: var(--gold); }

        .tb-footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 22px; padding-top: 14px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap; gap: 10px;
        }
        .tb-footer-status {
          font-family: var(--font-mono); font-size: .62rem;
          color: var(--orange); letter-spacing: .12em;
          animation: blink-banner 2s ease-in-out infinite;
        }
        .tb-footer-update {
          font-family: var(--font-mono); font-size: .58rem;
          color: var(--dim); letter-spacing: .12em;
        }

        @media (max-width: 540px) {
          .top-burners { margin: 40px 16px 0; padding: 22px 16px; }
          .tb-table th, .tb-table td { padding: 8px 8px; font-size: .62rem; }
        }

        /* ══ FAQ ══ */
        .faq-section { margin: 32px 24px 0; border: 1px solid var(--border); border-top: none; }
        .faq-header {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 16px 28px; border-bottom: 1px solid var(--border);
          font-family: var(--font-mono); font-size: .8rem; color: var(--gold);
          letter-spacing: .2em; background: none; border-top: none; border-left: none; border-right: none;
          cursor: pointer; transition: color .2s, background .2s; text-align: left;
        }
        .faq-header:hover { background: rgba(245,196,0,.03); }
        .faq-header .faq-icon { color: var(--gold); font-size: 1rem; }
        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-item:last-child { border-bottom: none; }
        .faq-q {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          background: none; border: none; cursor: pointer;
          padding: 16px 28px; text-align: left; gap: 16px; transition: background .2s;
        }
        .faq-q:hover { background: rgba(245,196,0,.03); }
        .faq-q span:first-child { font-family: var(--font-mono); font-size: .75rem; color: var(--white); letter-spacing: .04em; line-height: 1.4; }
        .faq-icon { font-family: var(--font-orb); font-size: 1rem; color: var(--gold); flex-shrink: 0; width: 16px; text-align: center; }
        .faq-a { padding: 0 28px 16px; font-size: .7rem; color: var(--dim); line-height: 1.8; border-top: 1px solid var(--border); padding-top: 12px; }
        .faq-item.open .faq-q span:first-child { color: var(--gold); }

        /* ══ FOOTER ══ */
        footer { padding: 32px 24px; text-align: center; border-top: 1px solid var(--border); margin-top: 24px; }
        .footer-line  { font-size: .7rem; color: var(--dim); letter-spacing: .2em; margin-bottom: 4px; }
        .footer-brand { font-family: var(--font-cond); font-size: 1rem; font-weight: 700; color: var(--gold); letter-spacing: .15em; margin-bottom: 12px; }
        .footer-disclaimer { font-size: .55rem; color: var(--dim); margin-top: 14px; letter-spacing: .08em; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6; }
        .footer-corners { display: flex; justify-content: space-between; margin-top: 24px; }
        .f-corner { width: 14px; height: 14px; border-color: var(--orange); border-style: solid; }
        .f-corner.fl { border-width: 0 0 2px 2px; }
        .f-corner.fr { border-width: 0 2px 2px 0; }

        /* ══ SAFETY MODAL ══ */
        .safety-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85); backdrop-filter: blur(6px); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .safety-modal { background: var(--surface); border: 1px solid var(--orange); box-shadow: 0 0 30px rgba(255,75,31,.3); padding: 28px 24px; max-width: 440px; width: 100%; }
        .safety-title { font-family: var(--font-orb); font-size: .95rem; color: var(--orange); letter-spacing: .15em; margin-bottom: 18px; text-align: center; }
        .safety-bullets { list-style: none; padding: 0; margin-bottom: 22px; }
        .safety-bullets li { font-family: var(--font-mono); font-size: .72rem; color: var(--white); padding: 7px 0 7px 18px; position: relative; line-height: 1.5; border-bottom: 1px solid var(--border); }
        .safety-bullets li:last-child { border-bottom: none; }
        .safety-bullets li::before { content: '›'; position: absolute; left: 0; top: 7px; color: var(--orange); font-weight: bold; }
        .safety-bullets li strong { color: var(--gold); }
        .safety-actions { display: flex; flex-direction: column; gap: 8px; }
        .safety-btn { padding: 11px 14px; font-family: var(--font-mono); font-size: .72rem; letter-spacing: .1em; cursor: pointer; text-decoration: none; text-align: center; border: 1px solid var(--border); background: transparent; color: var(--white); transition: border-color .2s, color .2s; }
        .safety-btn-primary { border-color: var(--green); color: var(--green); }
        .safety-btn-primary:hover { background: var(--green); color: #000; }
        .safety-btn-link { font-size: .6rem; color: var(--dim); border: none; }
        .safety-btn-link:hover { color: var(--gold); }
      `}</style>

      {/* ══ NAV ════════════════════════════════════════════════════════════ */}
      <nav id="top">
        <button className="nav-logo" onClick={() => scrollTo("top")}>
          <Image src="/favicon.svg" alt="$BRIX" width={26} height={26} priority/>
          $BRIX
        </button>

        <div className="ca-badge" onClick={copy}>
          BRiXc0ntr4ct
          <button className="copy-btn" aria-label="Copy address">
            <CopyIcon done={copied}/>
          </button>
        </div>

        <ul className="nav-links">
          <li><button onClick={() => scrollTo("top")}>HOME</button></li>
          <li><button onClick={() => scrollTo("sec-mission")}>MISSION</button></li>
          <li><button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button></li>
          <li><button className="nav-trixster" onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button></li>
          <li><button className="nav-mint" onClick={() => scrollTo("sec-mint")}>MINT</button></li>
          <li><button className="nav-burners" onClick={() => scrollTo("sec-top-burners")}>TOP BURNERS</button></li>
          <li><button onClick={() => scrollTo("sec-faq")}>FAQ</button></li>
          <li><a href="/docs.html" target="_blank" rel="noopener noreferrer">DOCS</a></li>
        </ul>

        <div className="nav-right-group">
          <div className="price-inline">
            <span className="pi-num">$0.000000</span>
            <span className="pi-change">+0.00%</span>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? "✕" : "☰"}
          </button>
          {menuOpen && (
            <div className="nav-dropdown">
              <button onClick={() => scrollTo("top")}>HOME</button>
              <button onClick={() => scrollTo("sec-mission")}>MISSION</button>
              <button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button>
              <button onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button>
              <button className="dd-mint" onClick={() => scrollTo("sec-mint")}>MINT</button>
              <button className="dd-burners" onClick={() => scrollTo("sec-top-burners")}>TOP BURNERS</button>
              <button onClick={() => scrollTo("sec-faq")}>FAQ</button>
              <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="dropdown-docs">DOCS</a>
            </div>
          )}
        </div>
      </nav>

      <StatsBar/>

      <div className="launch-banner">[ LAUNCHING SOON ]</div>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
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

      {/* ══ BURN COUNTER (tri-state) ═══════════════════════════════════════ */}
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
            {counter === "brix"    && <div className="burn-value brix">{BRIX_BURNED}</div>}
            {counter === "percent" && <div className="burn-value percent">{BURN_PERCENT}</div>}
            {counter === "usd"     && <div className="burn-value usd">{BURN_USD}</div>}
          </div>
        </div>

        <div className="burn-progress-wrap">
          <div className="burn-progress-track">
            <div className="burn-progress-fill" style={{ width: `${0}%` }}/>
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
            FOLLOW &nbsp;<img src="/logox.svg" alt="X" style={{width:"14px",height:"14px",verticalAlign:"middle",opacity:.85}}/>
          </a>
        </div>
        <div className="tl-sub">FOUR MINT PHASES. <span className="tw">3,333</span> NFTS. ONE MISSION.</div>
      </div>

      {/* ══ PILLARS ════════════════════════════════════════════════════════ */}
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
        <div className="number-cell">
          <div className="big-num n-gold">30</div>
          <div className="num-label">JACKPOTS</div>
        </div>
      </div>

      <div className="cta-row">
        <a href={GET_BRIX_LINK} className="btn btn-danger" title="Token Not Live Yet">BURN $BRIX &nbsp;›</a>
        <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="btn btn-outline">READ THE DOCS &nbsp;›</a>
      </div>

      {/* ══ BOTTOM GRID ════════════════════════════════════════════════════ */}
      <div className="bottom-grid">

        <div className="bottom-card" id="sec-how">
          <div className="card-title">[ HOW IT WORKS ]</div>
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
          <div className="card-title">[ TRIXSTER COLLECTION ]</div>
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
              <tr>
                <td className="tier-name">UNCOMMON</td>
                <td className="tier-count">1952</td>
                <td className="tier-weight" style={{color:"var(--dim)"}}>jackpot</td>
              </tr>
            </tbody>
          </table>
          <a href="/docs.html#rewards" target="_blank" rel="noopener noreferrer" className="btn-sm">REWARD FORMULA <span>›</span></a>
        </div>

        <div className="bottom-card" id="sec-mint">
          <div className="card-title">[ MINT BOX ]</div>
          <div className="mint-status-label">MINTING</div>
          <div className="coming-soon">COMING SOON</div>
          <div className="progress-track"><div className="progress-fill"/></div>
          <div className="progress-label">0 / 3333</div>
          <div className="mint-price-box">
            <div className="mint-price-main">F1 PRICE &nbsp;<strong>0.05 SOL</strong></div>
            <div className="mint-price-sub">REQUIRES 20K $BRIX BURN</div>
          </div>
          <div className="phase-rows">
            {[
              ["F1","0/690","20K $BRIX","SOON"],
              ["F2","0/750","40K $BRIX","—"],
              ["F3","0/850","80K $BRIX","—"],
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
              <button
                className="btn-connect-glow"
                disabled
                title="Minting Not Live Yet"
              >
                CONNECT WALLET
              </button>

              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: ".58rem",
                  letterSpacing: ".12em",
                  color: "var(--dim)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                Minting Not Live Yet
              </div>
            </div>
        </div>

      </div>

      {/* ══ TOP BURNERS ═══════════════════════════════════════════════════ */}
      <TopBurnersSection/>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <FaqSection/>

      <footer>
        <div className="footer-line">// THE GOAL IS ZERO</div>
        <div className="footer-brand">$BRIX BURNS</div>
        <div className="footer-disclaimer">
          Nothing on this site constitutes financial advice. Cryptocurrency and NFT markets involve risk.
          Burns are permanent. Mint payments are final. Reward amounts depend on actual phase performance.
          Read the <a href="/docs.html#safety" style={{color:"var(--gold)",textDecoration:"none"}}>safety section</a> before participating.
        </div>
        <div className="footer-corners">
          <div className="f-corner fl"/>
          <div className="f-corner fr"/>
        </div>
      </footer>

      {safetyOpen && <SafetyModal onAccept={acceptSafety} onClose={() => setSafetyOpen(false)}/>}

      </>
    </WalletContextProvider>
  );
}