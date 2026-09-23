"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type Abi, BaseError, ContractFunctionRevertedError } from "viem";
import { useConfig } from "wagmi";
import { simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { NET } from "./chain";
import { useLang } from "./i18n";

export type TxState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "pending"; hash: `0x${string}` }
  | { status: "done"; hash: `0x${string}` }
  | { status: "error"; message: string };

type Call = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

/**
 * Simulate, sign, wait, then refresh every read. The vault's require strings
 * are "English / 中文": the user only sees their half.
 */
export function useTx() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const [state, setState] = useState<TxState>({ status: "idle" });

  // A finished transaction fades back to idle so the form can be reused.
  useEffect(() => {
    if (state.status !== "done") return;
    const id = setTimeout(() => setState({ status: "idle" }), 8000);
    return () => clearTimeout(id);
  }, [state.status]);

  async function send(call: Call): Promise<boolean> {
    setState({ status: "signing" });
    try {
      const { request } = await simulateContract(config, { ...call, chainId: NET.chain.id } as Parameters<typeof simulateContract>[1]);
      const hash = await writeContract(config, request);
      setState({ status: "pending", hash });
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: NET.chain.id });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setState({ status: "done", hash });
      await queryClient.invalidateQueries();
      return true;
    } catch (e) {
      setState({ status: "error", message: readError(e, lang) });
      return false;
    }
  }

  return { state, send, reset: () => setState({ status: "idle" }) };
}

function readError(e: unknown, lang: "en" | "zh"): string {
  if (e instanceof BaseError) {
    const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const reason = revert.reason ?? revert.data?.errorName ?? revert.shortMessage;
      return pickLang(reason.replace(/^BRIX:\s*/, ""), lang);
    }
    if (e.walk((err) => (err as { code?: number }).code === 4001)) {
      return lang === "zh" ? "已取消" : "Cancelled";
    }
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}

function pickLang(text: string, lang: "en" | "zh"): string {
  const [en, zh] = text.split(" / ");
  return lang === "zh" && zh ? zh : en;
}

export function explorerTx(hash: string): string {
  return `${NET.chain.blockExplorers.default.url}/tx/${hash}`;
}
