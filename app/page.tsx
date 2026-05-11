// Minimal Next.js page (App Router style)
// Instructions:
// 1. npx create-next-app@latest brix-site
// 2. replace app/page.tsx with this file
// 3. npm install
// 4. npm run dev

"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";

// ── helpers ───────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function formatNumber(n: number) { return n.toLocaleString("en-US"); }

// PRE-LAUNCH: static zeros — replace with live hooks after token launch
const BURN_DISPLAY = "00,000,000";
const USD_DISPLAY  = "$00,000.00";

const stats = [
  { label: "PRICE",      value: "$0.000000"               },
  { label: "MARKET CAP", value: "$000,000"                },
  { label: "SUPPLY",     value: "000,000,000"             },
  { label: "BURNED",     value: "00.00%"                  },
  { label: "HOLDERS",    value: "000"                     },
  { label: "NOT",       value: "",           live: true  },
];

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is TRIXSTER?",
    a: "TRIXSTER is a collection of 3,333 unique NFTs on Solana, built on the Metaplex Core standard. Each Trixster carries a smirk that knows something you don't — forged in fire, fueled by $BRIX.",
  },
  {
    q: "What is $BRIX and why do I need it?",
    a: "$BRIX is the Solana token that powers the entire ecosystem. To mint a Trixster, you must burn $BRIX. Every burn is permanent and deflationary — 100% of burned tokens are destroyed forever.",
  },
  {
    q: "How does minting work?",
    a: "There are 4 mint phases (F1–F4). Each phase requires burning a set amount of $BRIX to gain access, then paying 0.25 SOL to mint. All SOL collected funds the reward pool and jackpots distributed to holders.",
  },
  {
    q: "What are the rarity tiers and rewards?",
    a: "There are 5 tiers: Legendary (82 NFTs, 1.5 SOL reward), Epic (259 NFTs, 1 SOL), Golden (331 NFTs, 0.5 SOL), Rare (709 NFTs, 0.25 SOL), and Uncommon (1,952 NFTs, no reward). Tier is hidden until reveal.",
  },
  {
    q: "When is the reveal?",
    a: "Each phase has its own reveal window. After a phase closes, a pre-reveal period begins where NFTs are tradeable with hidden traits — then the full reveal drops: rarity and all attributes are unlocked for all minted NFTs in that phase.",
  },
  {
    q: "What is the Jackpot?",
    a: "10% of each phase's SOL pool is reserved for the jackpot. Winners are drawn with probability weighted by NFT tier — the rarer your Trixster, the higher your odds; but REMEMBER, anyone can hit the Jackpot! There are 14 jackpots total across all 4 phases.",
  },
  {
    q: "What happens to unminted NFTs?",
    a: "NFTs not minted by the end of a phase simply don't exist on-chain. They are held in reserve for a potential Phase 5 (F5), whose parameters will be announced separately.",
  },
  {
    q: "Is there an ongoing reward system beyond mint phases?",
    a: "Yes. $BRIX trading fees and secondary royalties from NFT sales feed a perpetual reward pool distributed via periodic snapshots. Long-term holders will benefit from a loyalty boost.",
  },
  {
    q: "Where can I find more details about the project?",
    a: "All the technical details — tokenomics, mint mechanics, reward distribution, jackpot probabilities and more — are available in our full documentation at brix-burns.com/docs.html",
  },
];

// ── Copy icon ─────────────────────────────────────────────────────────────────
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

// ── StatsBar — CSS animation (smooth on all browsers) ────────────────────────
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
              <div className="s-value s-live"><span className="dot-red"/>LIVE</div>
            ) : (s as {soon?: boolean}).soon ? (
              <div className="s-value s-soon">SOON</div>
            ) : (
              <div className="s-value">{s.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAQ accordion item ────────────────────────────────────────────────────────
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

// ── FAQ section (collapsible) ─────────────────────────────────────────────────
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
export default function BrixPage() {
  // PRE-LAUNCH: remove these two lines and restore live hooks after token launch
  void useCountUp; // keep import alive
  const [copied,   setCopied]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [counter,  setCounter]  = useState<"brix"|"usd">("brix");
  const [flipping, setFlipping] = useState(false);

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flip = useCallback((target: "brix"|"usd") => {
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

  // smooth scroll helper
  const scrollTo = (id: string) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;700;900&family=Orbitron:wght@700;900&display=swap');

        :root {
          --bg:        #0a0a00;
          --surface:   #111100;
          --border:    #2a2a00;
          --gold:      #f5c400;
          --green:     #39ff14;
          --white:     #e8e8e0;
          --dim:       #888870;
          --font-mono: 'Share Tech Mono', monospace;
          --font-cond: 'Barlow Condensed', sans-serif;
          --font-orb:  'Orbitron', sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg); color: var(--white);
          font-family: var(--font-mono); overflow-x: hidden;
        }

        body::before {
          content: ''; position: fixed; inset: 0; z-index: 9999;
          background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px);
          pointer-events: none;
        }
        body::after {
          content: ''; position: fixed; inset: 0; z-index: 9998;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none; opacity:.4;
        }

        /* ══ NAV ══ */
        nav {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 12px;
          border-bottom: 1px solid var(--border);
          background: rgba(0,0,0,.75); backdrop-filter: blur(4px);
          position: sticky; top: 0; z-index: 200;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 5px;
          font-family: var(--font-orb); font-size: 1.05rem; font-weight: 900;
          color: var(--gold); letter-spacing: .04em;
          text-decoration: none; white-space: nowrap; cursor: pointer; background: none; border: none;
        }
        .nav-logo img { width: 26px; height: 26px; object-fit: contain; }

        .ca-badge {
          display: flex; align-items: center; gap: 5px;
          border: 1px solid var(--border); padding: 3px 7px; border-radius: 4px;
          font-size: .6rem; color: var(--dim);
          cursor: pointer; transition: border-color .2s; white-space: nowrap;
        }
        .ca-badge:hover { border-color: var(--gold); }
        .copy-btn {
          background: transparent; border: none; color: var(--dim);
          padding: 1px 2px; cursor: pointer; line-height: 0;
          display: flex; align-items: center; transition: color .2s;
        }
        .copy-btn:hover { color: var(--gold); }

        .nav-links { display: flex; gap: 18px; list-style: none; margin-left: auto; }
        .nav-links a, .nav-links button {
          color: var(--dim); text-decoration: none; background: none; border: none;
          font-family: var(--font-mono); font-size: .68rem; letter-spacing: .12em;
          cursor: pointer; transition: color .2s; padding: 0;
        }
        .nav-links a:hover, .nav-links button:hover { color: var(--white); }
        /* MINT link highlighted */
        .nav-links .nav-mint { color: var(--green); font-weight: bold; }
        .nav-links .nav-mint:hover { color: var(--white); }

        .nav-right-group {
          display: flex; align-items: center; gap: 8px;
          margin-left: auto; position: relative;
        }
        @media (min-width: 641px) { .nav-right-group { margin-left: 0; } }

        .price-inline { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
        .pi-num    { font-family: var(--font-orb); font-size: .85rem; color: var(--gold); }
        .pi-change { font-size: .56rem; color: var(--green); }

        .hamburger {
          background: none; border: 1px solid var(--border);
          color: var(--white); cursor: pointer;
          padding: 3px 7px; font-size: .85rem;
          display: none; transition: border-color .2s; flex-shrink: 0;
        }
        .hamburger:hover { border-color: var(--gold); color: var(--gold); }

        .nav-dropdown {
          position: absolute; top: calc(100% + 4px); right: 0;
          background: rgba(8,8,0,.97); border: 1px solid var(--border);
          min-width: 150px; z-index: 300;
        }
        .nav-dropdown button {
          display: block; width: 100%; text-align: left; padding: 10px 16px;
          color: var(--dim); background: none; border: none; border-bottom: 1px solid var(--border);
          font-family: var(--font-mono); font-size: .7rem; letter-spacing: .12em;
          cursor: pointer; transition: color .2s, background .2s;
        }
        .nav-dropdown button:last-child { border-bottom: none; }
        .nav-dropdown button:hover { color: var(--gold); background: rgba(245,196,0,.05); }
        .nav-dropdown .dd-mint { color: var(--green); }

        .nav-dropdown .dropdown-docs {
          display: block; width: 100%; text-align: left; padding: 10px 16px;
          color: var(--dim); background: none; border: none; border-bottom: 1px solid var(--border);
          font-family: var(--font-mono); font-size: .7rem; letter-spacing: .12em;
          cursor: pointer; transition: color .2s, background .2s; text-decoration: none;
        }

        .nav-dropdown .dropdown-docs:hover {
          color: var(--gold);
          background: rgba(245,196,0,.05);
        }

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
        .stats-outer {
          overflow: hidden; border-bottom: 1px solid var(--border);
          background: var(--surface); position: relative;
        }
        .stats-outer::before, .stats-outer::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 40px;
          z-index: 2; pointer-events: none;
        }
        .stats-outer::before { left: 0;  background: linear-gradient(90deg, var(--surface), transparent); }
        .stats-outer::after  { right: 0; background: linear-gradient(-90deg, var(--surface), transparent); }
        .stats-track {
          display: flex;
          animation: scroll-stats 28s linear infinite;
          width: max-content;
        }
        @keyframes scroll-stats {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .stat-item {
          flex: 0 0 auto; text-align: center;
          padding: 8px 22px; border-right: 1px solid var(--border);
        }
        .s-label { font-size: .55rem; color: var(--dim); letter-spacing: .1em; }
        .s-value { font-family: var(--font-orb); font-size: .78rem; color: var(--white); margin-top: 2px; white-space: nowrap; }
        .s-live  { display: flex; align-items: center; gap: 5px; color: #ff3333 !important; }
        .s-soon  { color: var(--green) !important; font-family: var(--font-orb); font-size: .78rem; margin-top: 2px; }
        /* red dot for LIVE */
        .dot-red { width: 6px; height: 6px; border-radius: 50%; background: #ff3333; flex-shrink: 0;
          animation: pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }

        /* ══ LAUNCH BANNER ══ */
        .launch-banner {
          text-align: center;
          padding: 8px 24px;
          font-family: var(--font-mono); font-size: 1.5rem;
          letter-spacing: .25em; color: var(--green);
          border-bottom: 1px solid var(--border);
          animation: blink-banner 1.4s ease-in-out infinite;
          background: rgba(57,255,20,.03);
        }
        @keyframes blink-banner {
          0%,100% { opacity: 1; }
          50%     { opacity: .35; }
        }

        /* ══ HERO ══ */
        .hero { padding: 60px 24px 40px; text-align: center; position: relative; }
        .hero-title {
          font-family: var(--font-cond);
          font-size: clamp(3.2rem, 10vw, 7rem);
          font-weight: 900; line-height: .92;
          letter-spacing: -.01em; text-transform: uppercase;
        }
        .h-dollar { color: var(--white); }
        .h-brix   { color: var(--gold); }
        .h-burns  { color: var(--white); }
        .h-dot    { color: var(--gold); }

        .corner { position: absolute; width: 18px; height: 18px; border-color: var(--green); border-style: solid; }
        .corner.tl { top: 12px; left: 12px;  border-width: 2px 0 0 2px; }
        .corner.tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
        .corner.bl { bottom: 12px; left: 12px;  border-width: 0 0 2px 2px; }
        .corner.br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }

        /* ══ BURN COUNTER ══ */
        .burn-section {
          display: flex; flex-direction: column; align-items: center;
          padding: 52px 24px 24px; gap: 18px;
        }
        .burn-tabs { display: flex; border: 1px solid var(--border); }
        .burn-tab {
          padding: 9px 24px; font-family: var(--font-mono); font-size: .72rem;
          letter-spacing: .1em; cursor: pointer; border: none; background: transparent;
          color: var(--dim); transition: color .2s, background .2s;
          text-transform: uppercase; border-right: 1px solid var(--border);
        }
        .burn-tab:last-child { border-right: none; }
        .burn-tab.active-brix { color: var(--gold);  background: rgba(245,196,0,.07); }
        .burn-tab.active-usd  { color: var(--green); background: rgba(57,255,20,.07); }
        .burn-tab:not(.active-brix):not(.active-usd):hover { color: var(--white); }

        .burn-box {
          border-width: 1px; border-style: solid;
          padding: 26px 48px; min-width: min(380px, 88vw);
          text-align: center; transition: border-color .3s;
        }
        .burn-box.brix-mode { border-color: var(--gold);  box-shadow: 0 0 18px rgba(245,196,0,.15); }
        .burn-box.usd-mode  { border-color: var(--green); box-shadow: 0 0 18px rgba(57,255,20,.15); }
        .burn-flip { transition: transform .28s ease, opacity .28s ease; }
        .burn-flip.flipping { transform: rotateX(80deg); opacity: 0; }
        .burn-value {
          font-family: var(--font-orb);
          font-size: clamp(2rem, 5.5vw, 3.2rem);
          letter-spacing: .02em; line-height: 1;
        }
        .burn-value.brix { color: var(--gold);  animation: glow-gold  2s ease-in-out infinite; }
        .burn-value.usd  { color: var(--green); animation: glow-green 2s ease-in-out infinite; }
        @keyframes glow-gold  {
          0%,100% { text-shadow: 0 0 8px rgba(245,196,0,.4), 0 0 20px rgba(245,196,0,.2); }
          50%     { text-shadow: 0 0 16px rgba(245,196,0,.9), 0 0 40px rgba(245,196,0,.5), 0 0 60px rgba(245,196,0,.2); }
        }
        @keyframes glow-green {
          0%,100% { text-shadow: 0 0 8px rgba(57,255,20,.4), 0 0 20px rgba(57,255,20,.2); }
          50%     { text-shadow: 0 0 16px rgba(57,255,20,.9), 0 0 40px rgba(57,255,20,.5), 0 0 60px rgba(57,255,20,.2); }
        }

        /* ══ TAGLINE ══ */
        .tagline {
          text-align: center; padding: 20px 24px 0;
          font-size: .8rem; letter-spacing: .12em; line-height: 2;
        }
        .tl-main { color: var(--gold); margin-bottom: 14px; }
        .tl-main .tw { color: var(--white); }
        .tl-cta  { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin: 14px 0; }
        .tl-sub  { color: var(--green); padding-bottom: 20px; }
        .tl-sub .tw { color: var(--white); }

        /* ══ BUTTONS ══ */
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

        /* ══ PILLARS ══ */
        .pillars {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: var(--border); margin: 0 24px;
        }
        @media (max-width: 640px) { .pillars { grid-template-columns: 1fr; } }
        .pillar { background: var(--bg); padding: 28px 24px; position: relative; }
        .pillar.align-left   { text-align: left; }
        .pillar.align-center { text-align: center; }
        .pillar.align-right  { text-align: right; }
        .pc { position: absolute; width: 10px; height: 10px; border-color: var(--green); border-style: solid; }
        .pc.tl { top:0;    left:0;  border-width: 2px 0 0 2px; }
        .pc.br { bottom:0; right:0; border-width: 0 2px 2px 0; }
        .pillar-tag   { font-size: .8rem; color: var(--dim); letter-spacing: .15em; margin-bottom: 10px; }
        .pillar-title { font-family: var(--font-cond); font-size: 1.6rem; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
        .p-burn { color: var(--green); }
        .p-win  { color: var(--white); }
        .p-feed { color: var(--gold); }
        .pillar-body  { font-size: .72rem; color: var(--dim); line-height: 1.6; }

        /* ══ NUMBERS ══ */
        .numbers-row {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: var(--border); margin: 24px 24px 0;
        }
        @media (max-width: 640px) { .numbers-row { grid-template-columns: 1fr; } }
        .number-cell { background: var(--surface); padding: 28px 20px; text-align: center; }
        .big-num {
          font-family: var(--font-orb);
          font-size: clamp(2.4rem,6vw,3.5rem); font-weight: 900; letter-spacing: .04em;
        }
        .n-green { color: var(--green); }
        .n-white { color: var(--white); }
        .n-gold  { color: var(--gold); }
        .num-label { font-size: .65rem; color: var(--dim); letter-spacing: .2em; margin-top: 6px; }

        /* ══ CTA row ══ */
        .cta-row {
          display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;
          padding: 36px 24px;
        }

        /* ══ BOTTOM GRID ══ */
        .bottom-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 1px; background: var(--border); margin: 0 24px;
        }
        @media (max-width: 768px) { .bottom-grid { grid-template-columns: 1fr; } }
        .bottom-card {
          background: var(--surface); padding: 28px 24px;
          position: relative; display: flex; flex-direction: column;
        }
        .card-title { font-size: .75rem; color: var(--green); letter-spacing: .2em; margin-bottom: 18px; text-transform: uppercase; }

        /* HOW IT WORKS */
        .how-step { display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start; }
        .step-num  { font-family: var(--font-orb); font-size: .7rem; color: var(--gold); min-width: 22px; }
        .step-title { font-size: .75rem; color: var(--white); font-weight: bold; text-transform: uppercase; letter-spacing: .08em; }
        .step-sub   { font-size: .68rem; color: var(--dim); }
        .simple-line { margin-top: 18px; font-family: var(--font-cond); font-size: 1.3rem; font-weight: 900; color: var(--gold); text-transform: uppercase; }
        /* DETAILS button bottom-right */
        .card-footer-btn {
          margin-top: auto; padding-top: 16px;
          display: flex; justify-content: flex-end;
        }
        .btn-details {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 10px 14px;
          background: transparent; border: 1px solid var(--dim);
          color: var(--white); font-family: var(--font-mono); font-size: .75rem;
          cursor: pointer; transition: border-color .2s, color .2s; margin-top: auto;
        }
        .btn-details:hover { border-color: var(--gold); color: var(--gold); }

        /* TRIXSTER */
        .nft-preview {
          border: 3px solid rgba(57,255,20,.9);
          display: flex; align-items: center; justify-content: center;
          height: 160px; margin-bottom: 12px;
          background: #fab700; overflow: hidden;
        }
        .nft-preview img { width: 130%; height: 130%; object-fit: contain; }
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.3} 94%{opacity:1} 96%{opacity:.5} 97%{opacity:1} }
        .nft-desc { font-size: .7rem; color: var(--dim); text-align: center; margin-bottom: 14px; }
        .nft-desc strong { color: var(--white); display: block; margin-bottom: 4px; }
        /* tier table */
        .tier-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .tier-table td {
          font-size: .62rem; padding: 4px 6px; border-bottom: 1px solid var(--border);
          font-family: var(--font-mono);
        }
        .tier-table tr:last-child td { border-bottom: none; }
        .tier-name { color: var(--dim); }
        .tier-count { color: var(--white); text-align: center; }
        .tier-reward { color: var(--gold); text-align: right; }
        .tier-legendary .tier-name { color: #ff6b35; }
        .tier-epic      .tier-name { color: #a855f7; }
        .tier-golden    .tier-name { color: var(--gold); }
        .tier-rare      .tier-name { color: #60a5fa; }
        .btn-sm {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 10px 14px;
          background: transparent; border: 1px solid var(--dim);
          color: var(--white); font-family: var(--font-mono); font-size: .75rem;
          cursor: pointer; transition: border-color .2s, color .2s; margin-top: auto;
        }
        .btn-sm:hover { border-color: var(--gold); color: var(--gold); }

        /* MINT BOX */
        .mint-status-label { font-size: .6rem; color: var(--dim); letter-spacing: .15em; margin-bottom: 4px; }
        .coming-soon { font-family: var(--font-orb); font-size: 1rem; color: var(--gold); margin-bottom: 10px; }
        .progress-track { background: var(--border); height: 6px; margin-bottom: 5px; overflow: hidden; }
        .progress-fill  { height: 100%; width: 1.5%; background: var(--green); box-shadow: 0 0 8px var(--green); }
        .progress-label { font-size: .6rem; color: var(--dim); text-align: right; margin-bottom: 12px; }
        .mint-price-box {
          border: 1px solid var(--border); padding: 8px 12px;
          margin-bottom: 12px; line-height: 1.6;
        }
        .mint-price-main { font-size: .7rem; color: var(--dim); }
        .mint-price-main strong { color: var(--white); font-size: .78rem; }
        .mint-price-sub  { font-size: .62rem; color: var(--dim); }
        /* reward pool box */
        .reward-pool-box {
          border: 1px solid var(--border); padding: 8px 12px;
          margin-bottom: 12px; line-height: 1.6;
          background: rgba(245,196,0,.03);
        }
        .reward-pool-label { font-size: .62rem; color: var(--dim); letter-spacing: .08em; margin-bottom: 2px; }
        .reward-pool-value {
          font-family: var(--font-orb); font-size: 1rem;
          color: var(--gold); letter-spacing: .04em;
        }
        .reward-pool-sub { font-size: .58rem; color: var(--dim); margin-top: 1px; }
        .phase-rows { margin-bottom: 14px; }
        .phase-row {
          display: grid;
          grid-template-columns: 22px 44px 1fr 60px 34px;
          align-items: center; gap: 6px;
          padding: 5px 0; border-bottom: 1px solid var(--border);
        }
        .phase-row:last-child { border-bottom: none; }
        .ph-name  { font-family: var(--font-orb); font-size: .58rem; color: var(--dim); }
        .ph-nfts  { font-size: .6rem; color: var(--white); white-space: nowrap; }
        .ph-bar-wrap { height: 4px; background: var(--border); overflow: hidden; border-radius: 0; }
        .ph-bar-fill { height: 100%; width: 0%; background: var(--green); }
        .ph-burn  { font-size: .58rem; color: var(--gold); text-align: right; white-space: nowrap; }
        .ph-status { font-size: .55rem; color: var(--green); text-align: right; letter-spacing: .06em; }
        .ph-status.soon { color: var(--green); }
        .ph-status.live { color: var(--green); font-weight: bold; }
        /* connect wallet with glow pulse */
        .btn-connect-glow {
          width: 100%; padding: 13px; margin-top: auto;
          background: transparent; border: 1px solid var(--green);
          color: var(--green); font-family: var(--font-mono); font-size: .82rem;
          font-weight: bold; letter-spacing: .12em; cursor: pointer;
          animation: glow-btn 2s ease-in-out infinite;
          transition: background .2s, color .2s;
        }
        .btn-connect-glow:hover { background: var(--green); color: #000; animation: none; }
        .btn-connect-glow:disabled {
          border-color: var(--border); color: var(--dim);
          animation: none; cursor: not-allowed; box-shadow: none;
        }
        @keyframes glow-btn {
          0%,100% { box-shadow: 0 0 4px rgba(57,255,20,.3); border-color: rgba(57,255,20,.7); }
          50%     { box-shadow: 0 0 16px rgba(57,255,20,.8), 0 0 30px rgba(57,255,20,.3); border-color: var(--green); }
        }

        /* ══ FAQ ══ */
        .faq-section {
          margin: 32px 24px 0; border: 1px solid var(--border);
          border-top: none;
        }
        .faq-header {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 16px 28px;
          border-bottom: 1px solid var(--border);
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
          padding: 16px 28px; text-align: left; gap: 16px;
          transition: background .2s;
        }
        .faq-q:hover { background: rgba(245,196,0,.03); }
        .faq-q span:first-child {
          font-family: var(--font-mono); font-size: .75rem;
          color: var(--white); letter-spacing: .04em; line-height: 1.4;
        }
        .faq-icon {
          font-family: var(--font-orb); font-size: 1rem;
          color: var(--gold); flex-shrink: 0; width: 16px; text-align: center;
        }
        .faq-a {
          padding: 0 28px 16px;
          font-size: .7rem; color: var(--dim); line-height: 1.8;
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }
        .faq-item.open .faq-q span:first-child { color: var(--gold); }

        /* ══ FOOTER ══ */
        footer { padding: 32px 24px; text-align: center; border-top: 1px solid var(--border); margin-top: 24px; }
        .footer-line  { font-size: .7rem; color: var(--dim); letter-spacing: .2em; margin-bottom: 4px; }
        .footer-brand { font-family: var(--font-cond); font-size: 1rem; font-weight: 700; color: var(--gold); letter-spacing: .15em; }
        .footer-corners { display: flex; justify-content: space-between; margin-top: 24px; }
        .f-corner { width: 14px; height: 14px; border-color: var(--green); border-style: solid; }
        .f-corner.fl { border-width: 0 0 2px 2px; }
        .f-corner.fr { border-width: 0 2px 2px 0; }
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

        {/* desktop links */}
        <ul className="nav-links">
          <li><button onClick={() => scrollTo("top")}>HOME</button></li>
          <li><button onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button></li>
          <li><button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button></li>
          <li><button className="nav-mint" onClick={() => scrollTo("sec-mint")}>MINT</button></li>
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
              <button onClick={() => scrollTo("sec-trixster")}>TRIXSTER</button>
              <button onClick={() => scrollTo("sec-how")}>HOW IT WORKS</button>
              <button className="dd-mint" onClick={() => scrollTo("sec-mint")}>MINT</button>
              <button onClick={() => scrollTo("sec-faq")}>FAQ</button>
              <a
  href="/docs.html"
  target="_blank"
  rel="noopener noreferrer"
  className="dropdown-docs"
>
  DOCS
</a>
            </div>
          )}
        </div>
      </nav>

      {/* ══ STATS BAR ══════════════════════════════════════════════════════ */}
      <StatsBar/>

      {/* ══ LAUNCHING SOON BANNER ══════════════════════════════════════════ */}
      <div className="launch-banner">[ LAUNCHING SOON ]</div>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="hero">
        <div className="corner tl"/><div className="corner tr"/>
        <div className="corner bl"/><div className="corner br"/>
        <h1 className="hero-title">
          <span className="h-dollar">$</span><span className="h-brix">BRIX</span>{" "}
          <span className="h-burns">BURNS</span><span className="h-dot">.</span>
        </h1>
      </section>

      {/* ══ BURN COUNTER — PRE-LAUNCH static zeros ═════════════════════════ */}
      <div className="burn-section">
        <div className="burn-tabs">
          <button className={`burn-tab${counter === "brix" ? " active-brix" : ""}`} onClick={() => flip("brix")}>
            LIVE $BRIX BURNED
          </button>
          <button className={`burn-tab${counter === "usd" ? " active-usd" : ""}`} onClick={() => flip("usd")}>
            $ VALUE LOCKED
          </button>
        </div>
        <div className={`burn-box ${counter === "brix" ? "brix-mode" : "usd-mode"}`}>
          <div className={`burn-flip${flipping ? " flipping" : ""}`}>
            {counter === "brix"
              ? <div className="burn-value brix">{BURN_DISPLAY}</div>
              : <div className="burn-value usd">{USD_DISPLAY}</div>
            }
          </div>
        </div>
      </div>

      {/* ══ TAGLINE ════════════════════════════════════════════════════════ */}
      <div className="tagline">
        <div className="tl-main">A <span className="tw">SYSTEM</span> THAT REDUCES ITSELF INTO VALUE.</div>
        <div className="tl-cta">
           <a href="#" className="btn btn-primary" title="Token Not Live Yet">GET $BRIX &nbsp;›</a>
          <a href="https://x.com/BRIX_burns" target="_blank" rel="noopener noreferrer" className="btn btn-outline">FOLLOW &nbsp;<img src="/logox.svg" alt="X" style={{width:"14px",height:"14px",verticalAlign:"middle",opacity:.85}}/></a>
        </div>
        <div className="tl-sub">MINTING FEEDS THE <span className="tw">REWARD</span> POOL.</div>
      </div>

      {/* ══ PILLARS ════════════════════════════════════════════════════════ */}
      <div className="pillars">
        <div className="pillar align-left">
          <div className="pc tl"/>
          <div className="pillar-tag">[ BURN ]</div>
          <div className="pillar-title p-burn">BURN TO MINT.</div>
          <div className="pillar-body">Burn $BRIX to mint exclusive Trixster NFTs.</div>
        </div>
        <div className="pillar align-center">
          <div className="pillar-tag">[ WIN ]</div>
          <div className="pillar-title p-win">MINT TO WIN.</div>
          <div className="pillar-body">Every mint increases the prize for the winners.</div>
        </div>
        <div className="pillar align-right">
          <div className="pc br"/>
          <div className="pillar-tag">[ FEED ]</div>
          <div className="pillar-title p-feed">FEED THE SYSTEM.</div>
          <div className="pillar-body">Your mint fuels the reward pool, not the dev.</div>
        </div>
      </div>

      {/* ══ NUMBERS ════════════════════════════════════════════════════════ */}
      <div className="numbers-row">
        <div className="number-cell">
          <div className="big-num n-green">3333</div>
          <div className="num-label">NFTS</div>
        </div>
        <div className="number-cell">
          <div className="big-num n-white">1333</div>
          <div className="num-label">WINNERS</div>
        </div>
        <div className="number-cell">
          <div className="big-num n-gold">14</div>
          <div className="num-label">JACKPOTS</div>
        </div>
      </div>

      {/* ══ CTA ════════════════════════════════════════════════════════════ */}
      <div className="cta-row">
        <a href="#" className="btn btn-primary" title="Token Not Live Yet">GET $BRIX &nbsp;›</a>
        <a href="https://x.com/BRIX_burns" target="_blank" rel="noopener noreferrer" className="btn btn-outline">FOLLOW &nbsp;<img src="/logox.svg" alt="X" style={{width:"14px",height:"14px",verticalAlign:"middle",opacity:.85}}/></a>
      </div>

      {/* ══ BOTTOM GRID ════════════════════════════════════════════════════ */}
      <div className="bottom-grid">

        {/* HOW IT WORKS */}
        <div className="bottom-card" id="sec-how">
          <div className="card-title">[ HOW IT WORKS ]</div>
          {[
            ["01","BUY $BRIX","Get $BRIX on Raydium."],
            ["02","BURN TO MINT","Burn $BRIX to mint Trixster NFTs."],
            ["03","REDUCE SUPPLY","Every mint burns tokens forever."],
            ["04","FUND REWARDS","SOL from mints goes to the reward pool."],
            ["05","WINNERS WIN","1333 Winners. 14 Jackpots!"],
          ].map(([n,t,s]) => (
            <div className="how-step" key={n}>
              <span className="step-num">{n}</span>
              <div>
                <div className="step-title">{t}</div>
                <div className="step-sub">{s}</div>
              </div>
            </div>
          ))}
          <div className="simple-line">IT'S THAT SIMPLE.</div>
          <div className="card-footer-btn">
            <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="btn-details">DETAILS <span>›</span></a>
          </div>
        </div>

        {/* TRIXSTER COLLECTION */}
        <div className="bottom-card" id="sec-trixster">
          <div className="card-title">[ TRIXSTER COLLECTION ]</div>
          <div className="nft-preview">
            <Image src="/nft_preview.png" alt="Trixster NFT" width={160} height={160}/>
          </div>
          <div className="nft-desc">
            <strong>3333 UNIQUE NFTS</strong>
            BUILT FOR THE $BRIX BELIEVERS.
          </div>
          <table className="tier-table">
            <tbody>
              <tr className="tier-legendary">
                <td className="tier-name">LEGENDARY</td>
                <td className="tier-count">82</td>
                <td className="tier-reward">1.5 SOL</td>
              </tr>
              <tr className="tier-epic">
                <td className="tier-name">EPIC</td>
                <td className="tier-count">259</td>
                <td className="tier-reward">1 SOL</td>
              </tr>
              <tr className="tier-golden">
                <td className="tier-name">GOLDEN</td>
                <td className="tier-count">331</td>
                <td className="tier-reward">0.5 SOL</td>
              </tr>
              <tr className="tier-rare">
                <td className="tier-name">RARE</td>
                <td className="tier-count">709</td>
                <td className="tier-reward">0.25 SOL</td>
              </tr>
              <tr>
                <td className="tier-name">UNCOMMON</td>
                <td className="tier-count">1952</td>
                <td className="tier-reward" style={{color:"var(--dim)"}}>—</td>
              </tr>
            </tbody>
          </table>
          <a href="/docs.html" target="_blank" rel="noopener noreferrer" className="btn-sm"> LEARN MORE <span>›</span></a>
        </div>

        {/* MINT BOX */}
        <div className="bottom-card" id="sec-mint">
          <div className="card-title">[ MINT BOX ]</div>
          <div className="mint-status-label">MINTING</div>
          <div className="coming-soon">COMING SOON</div>
          {/* global progress 0–3333 */}
          <div className="progress-track"><div className="progress-fill"/></div>
          <div className="progress-label">0 / 3333</div>
          {/* price box */}
          <div className="mint-price-box">
            <div className="mint-price-main">PRICE &nbsp;<strong>0.25 SOL</strong></div>
            <div className="mint-price-sub">REQUIRES $BRIX BURN</div>
          </div>
          {/* phase table */}
          <div className="phase-rows">
            {[
              ["F1","0/690","50K $BRIX","SOON"],
              ["F2","0/750","69K $BRIX","—"],
              ["F3","0/850","77K $BRIX","—"],
              ["F4","0/1043","85K $BRIX","—"],
            ].map(([name, prog, burn, status]) => (
              <div className="phase-row" key={name}>
                <span className="ph-name">{name}</span>
                <span className="ph-nfts">{prog}</span>
                <div className="ph-bar-wrap"><div className="ph-bar-fill"/></div>
                <span className="ph-burn">{burn}</span>
                <span className={`ph-status${status === "LIVE" ? " live" : status === "SOON" ? " soon" : ""}`}>{status}</span>
              </div>
            ))}
          </div>
          {/* reward pool balance */}
          <div className="reward-pool-box">
            <div className="reward-pool-label">REWARD POOL BALANCE</div>
            <div className="reward-pool-value">0.00 SOL</div>
            <div className="reward-pool-sub">LIVE · UPDATED EACH BLOCK</div>
          </div>
          <button className="btn-connect-glow" disabled title="Minting Not Live Yet">CONNECT WALLET</button>
        </div>

      </div>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <FaqSection/>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer>
        <div className="footer-line">SOMETHING IS BEING BUILT</div>
        <div className="footer-brand">$BRIX BY $BRIX</div>
        <div className="footer-corners">
          <div className="f-corner fl"/>
          <div className="f-corner fr"/>
        </div>
      </footer>
    </>
  );
}


