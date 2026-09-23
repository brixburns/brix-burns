"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { INITIAL_SUPPLY, IS_TESTNET, MAX_TRIXSTERS, NET, SHOW_TOP_BURNERS } from "./lib/chain";
import { fmtBnb, fmtBrix, fmtCountdown, fmtFloorPerMillion, fmtPct } from "./lib/format";
import { useLang } from "./lib/i18n";
import { Usd } from "./lib/prices";
import { useVault, type VaultState } from "./lib/useVault";
import Crack from "./sections/Crack";
import How from "./sections/How";
import Mint from "./sections/Mint";
import { Cta } from "./sections/shared";
import Redeem from "./sections/Redeem";
import TopBurners from "./sections/TopBurners";

type StatItem = { label: string; value: string };

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

// ── CLOCK ────────────────────────────────────────────────────────────────────
function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
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
            <div className="s-label">{s.label}</div>
            <div className="s-value">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WALLET BUTTON ────────────────────────────────────────────────────────────
function WalletButton() {
  const { t } = useLang();
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button className="wallet-btn" disabled={isPending} onClick={() => connectors[0] && connect({ connector: connectors[0] })}>
        {isPending ? "…" : t.connect}
      </button>
    );
  }
  if (chainId !== NET.chain.id) {
    return (
      <button className="wallet-btn wallet-warn" onClick={() => switchChain({ chainId: NET.chain.id })}>
        {t.wrongChain}
      </button>
    );
  }
  return (
    <button className="wallet-btn wallet-on" onClick={() => disconnect()} title="Disconnect">
      {address!.slice(0, 6)}…{address!.slice(-4)}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button className="lang-btn" onClick={() => setLang(lang === "en" ? "zh" : "en")} aria-label="Language">
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}

// ── MINT CLOCK ───────────────────────────────────────────────────────────────
function MintClock({ v, now }: { v: VaultState; now: number }) {
  const { t } = useLang();
  if (v.mintOpen) return <><span className="mc-label">{t.mintEndsIn}</span> <span className="mc-time">{fmtCountdown(v.mintEnd - now)}</span></>;
  if (!v.finalized && v.revealAt > now) return <><span className="mc-label">{t.revealIn}</span> <span className="mc-time">~{fmtCountdown(v.revealAt - now)}</span></>;
  return <span className="mc-label">{v.finalized ? t.revealed : t.mintClosed}</span>;
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================
export default function BrixPage() {
  const { t } = useLang();
  const { data: v, error } = useVault();
  const now = useNow();
  const [copied, setCopied] = useState(false);

  const placeholder = error ? t.offline : "—";
  const stats: StatItem[] = [
    { label: t.floorLabel, value: v ? fmtFloorPerMillion(v.floor) : placeholder },
    { label: t.reserve,    value: v ? `${fmtBnb(v.reserve)} BNB` : placeholder },
    { label: t.supply,     value: v ? fmtBrix(v.supply) : placeholder },
    { label: t.burned,     value: v ? fmtPct(v.burned, INITIAL_SUPPLY) : placeholder },
    { label: t.pot,        value: v ? `${fmtBrix(v.potBrix)} $BRIX` : placeholder },
    { label: t.minted,     value: v ? `${v.minted} / ${MAX_TRIXSTERS}` : placeholder },
  ];

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback(() => {
    if (!NET.token) return;
    navigator.clipboard.writeText(NET.token);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
  }, []);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const mintedPct = v ? Math.min((v.minted / MAX_TRIXSTERS) * 100, 100) : 0;

  return (
    <>
      {/* == NAV ============================================================ */}
      <nav id="top">
        <button className="nav-logo" onClick={scrollTop}>
          <Image src="/favicon.svg" alt="$BRIX" width={26} height={26} priority/>
          $BRIX
        </button>

        {NET.token && (
          <div className="ca-badge" onClick={copy}>
            {NET.token.slice(0, 6)}…{NET.token.slice(-4)}
            <button className="copy-btn" aria-label="Copy address">
              <CopyIcon done={copied}/>
            </button>
          </div>
        )}
        {IS_TESTNET && <span className="net-badge">{t.testnet}</span>}

        <ul className="nav-links">
          <li><a href="#mint" className="nav-mint">{t.navMint}</a></li>
          <li><a href="#crack" className="nav-burners">{t.navCrack}</a></li>
          <li><a href="#redeem">{t.navRedeem}</a></li>
          {SHOW_TOP_BURNERS && <li><a href="#top-burners" className="nav-burners">{t.navTop}</a></li>}
          <li><a href="#how">{t.navHow}</a></li>
        </ul>

        <div className="nav-right-group">
          <LangToggle/>
          <WalletButton/>
        </div>
      </nav>

      <StatsBar stats={stats}/>

      {/* == HERO =========================================================== */}
      <section className="hero" id="sec-mission">
        <div className="corner tl"/><div className="corner tr"/>
        <div className="corner bl"/><div className="corner br"/>

        <div className="hero-eyebrow">
          {t.eyebrow.split("BNB").flatMap((part, i) => i ? [<span className="h-bnb" key={i}>BNB</span>, part] : [part])}
        </div>

        <h1 className="hero-title">
          <Image src="/favicon.svg" alt="" width={120} height={120} className="h-logo" priority/>
          <span className="h-dollar">$</span><span className="h-brix">BRIX</span>{" "}
          <span className="h-burns">BURNS</span><span className="h-dot">.</span>
        </h1>

        <div className="mantra">
          <span className="m-zero">{t.mantra}</span>
        </div>
        <p className="hero-sub">{t.heroSub}</p>
      </section>

      {/* == FLOOR ========================================================== */}
      <div className="burn-section">
        <div className="floor-label">{t.floorLabel}</div>
        <div className="burn-box floor-mode">
          <div className="burn-value floor">{v ? <Usd bnb={v.floor * 1_000_000n}>{fmtFloorPerMillion(v.floor)}</Usd> : placeholder}</div>
        </div>
        <div className="floor-row">
          <span>{t.reserve} <b className="bnb">{v ? <Usd bnb={v.reserve}>{fmtBnb(v.reserve)} BNB</Usd> : "—"}</b></span>
          <span>{t.burned} <b>{v ? <Usd brix={v.burned}>{fmtBrix(v.burned)} $BRIX</Usd> : "—"}</b></span>
        </div>

        {/* == MINT PROGRESS ================================================ */}
        <div className="burn-progress-wrap">
          <div className="burn-progress-track">
            <div className="burn-progress-fill" style={{ width: `${mintedPct}%` }}/>
          </div>
          <div className="burn-progress-labels">
            <span>{t.minted}</span>
            <span className="target-label">{v ? `${v.minted} / ${MAX_TRIXSTERS}` : "—"}</span>
          </div>
          <div className="mint-clock">{v && <MintClock v={v} now={now}/>}</div>
        </div>
      </div>

      <div className="tagline tagline-top"><Cta/></div>

      <Mint v={v}/>
      <Crack v={v}/>
      <Redeem/>
      {SHOW_TOP_BURNERS && <TopBurners v={v} preview={process.env.NODE_ENV === "development"}/>}
      <How/>

      <div className="tagline">
        <Cta/>
      </div>

      <footer>
        <div className="footer-line">{t.footerLine}</div>
        <div className="footer-brand">$BRIX BURNS</div>
        <div className="footer-disclaimer">{t.disclaimer}</div>
        <div className="footer-corners">
          <div className="f-corner fl"/>
          <div className="f-corner fr"/>
        </div>
      </footer>
    </>
  );
}
