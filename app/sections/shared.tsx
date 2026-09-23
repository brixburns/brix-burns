"use client";

import Image from "next/image";
import { useAccount, useBalance, useConnect, useReadContracts, useSwitchChain } from "wagmi";
import { erc20Abi } from "../lib/abi";
import { NET } from "../lib/chain";
import { useLang } from "../lib/i18n";
import { explorerTx, type TxState } from "../lib/useTx";

const token = NET.token as `0x${string}`;
const vault = NET.vault as `0x${string}`;

/** The connected wallet on BNB Chain: $BRIX balance and allowance to the vault, BNB balance. */
export function useWallet() {
  const { address, chainId, isConnected } = useAccount();
  const onChain = isConnected && chainId === NET.chain.id;
  const { data } = useReadContracts({
    contracts: [
      { address: token, abi: erc20Abi, functionName: "balanceOf", args: [address!], chainId: NET.chain.id },
      { address: token, abi: erc20Abi, functionName: "allowance", args: [address!, vault], chainId: NET.chain.id },
    ],
    allowFailure: false,
    query: { enabled: !!address && !!NET.token, refetchInterval: 15_000 },
  });
  const { data: bnb } = useBalance({ address, chainId: NET.chain.id, query: { refetchInterval: 15_000 } });
  return {
    address,
    isConnected,
    onChain,
    brix: data?.[0] as bigint | undefined,
    allowance: data?.[1] as bigint | undefined,
    bnb: bnb?.value,
  };
}

/** Connect, or switch to BNB Chain: shown in place of an action button. */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const { isConnected, onChain } = useWallet();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  if (!isConnected) {
    return <button className="act-btn" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>{t.connectFirst}</button>;
  }
  if (!onChain) {
    return <button className="act-btn act-warn" onClick={() => switchChain({ chainId: NET.chain.id })}>{t.wrongChain}</button>;
  }
  return <>{children}</>;
}

export function TxStatus({ state, done }: { state: TxState; done: string }) {
  const { t } = useLang();
  if (state.status === "idle") return null;
  if (state.status === "error") return <div className="tx-status tx-error">{state.message}</div>;
  const text = state.status === "signing" ? t.txSigning : state.status === "pending" ? t.txPending : done;
  return (
    <div className={`tx-status${state.status === "done" ? " tx-done" : ""}`}>
      {text}
      {"hash" in state && (
        <a href={explorerTx(state.hash)} target="_blank" rel="noopener noreferrer">{t.txView} ›</a>
      )}
    </div>
  );
}

const X_LINK = "https://x.com/BRIX_burns";

/** A button that is a link once its destination exists, disabled until then. */
function LinkBtn({ href, className, label, children }: { href: string; className: string; label: string; children: React.ReactNode }) {
  const { t } = useLang();
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`btn ${className}`} aria-label={label}>{children}</a>
    : <span className={`btn ${className} btn-disabled`} title={t.notLive} aria-label={label} aria-disabled="true">{children}</span>;
}

/**
 * GET $BRIX (Flap), OpenSea, X, with the platforms' own logos. On phones the
 * three stay side by side: the words go and only the marks remain.
 */
export function Cta() {
  const { t } = useLang();
  return (
    <div className="tl-cta cta-brands">
      <LinkBtn href={NET.flap} className="btn-outline btn-flap btn-brand" label={`${t.getBrixBtn} Flap`}>
        <span className="cta-words">{t.getBrixBtn}</span>
        <Image src="/flap-logo.svg" alt="" width={93} height={16} className="cta-full"/>
        <Image src="/flap-mark.svg" alt="" width={24} height={20} className="cta-mark"/>
      </LinkBtn>
      <LinkBtn href={NET.opensea} className="btn-outline btn-opensea btn-brand" label={`${t.openseaBtn} OpenSea`}>
        <span className="cta-words">{t.openseaBtn}</span>
        <Image src="/opensea-logo.svg" alt="" width={77} height={20} className="cta-full"/>
        <Image src="/opensea-mark.svg" alt="" width={24} height={24} className="cta-mark"/>
      </LinkBtn>
      <a href={X_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-brand" aria-label={`${t.follow} X`}>
        <span className="cta-words">{t.follow}</span>
        <Image src="/logox.svg" alt="" width={14} height={14} style={{ opacity: .85 }}/>
      </a>
    </div>
  );
}

export function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="panel" id={id}>
      <h2 className="panel-title">{title}</h2>
      <p className="panel-lead">{lead}</p>
      {children}
    </section>
  );
}
