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

/** GET $BRIX (Flap), OpenSea, X. A link without a destination yet shows disabled. */
export function Cta() {
  const { t } = useLang();
  return (
    <div className="tl-cta">
      {NET.flap
        ? <a href={NET.flap} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{t.getBrixBtn} &nbsp;›</a>
        : <span className="btn btn-primary btn-disabled" title={t.notLive} aria-disabled="true">{t.getBrixBtn} &nbsp;›</span>}
      {NET.opensea
        ? <a href={NET.opensea} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-opensea">{t.openseaBtn}</a>
        : <span className="btn btn-outline btn-opensea btn-disabled" title={t.notLive} aria-disabled="true">{t.openseaBtn}</span>}
      <a href={X_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
        {t.follow} &nbsp;<Image src="/logox.svg" alt="X" width={14} height={14} style={{ verticalAlign: "middle", opacity: .85 }}/>
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
