"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

// Glossary: BRIX VAULT/art/TESTI.md — floor 地板价, reserve 储备金, burn 销毁,
// dowry 奖励, dowry pot 奖励池, crack 打碎, mint 铸造.
const en = {
  eyebrow: "// BACKED BY BNB. BRIX BY BRIX.",
  mantra: "THE FLOOR RISES.",
  heroSub: "Every $BRIX is backed by a BNB reserve that only grows with trading tax. When the price drops below it, burn instead of selling.",
  floorLabel: "FLOOR · BNB PER 1M $BRIX",
  reserve: "RESERVE",
  supply: "SUPPLY",
  burned: "BURNED",
  pot: "DOWRY POT",
  minted: "TRIXSTERS MINTED",
  mintEndsIn: "MINT ENDS IN",
  revealIn: "REVEAL IN",
  mintClosed: "MINT CLOSED",
  revealed: "REVEALED",
  connect: "CONNECT",
  wrongChain: "SWITCH TO BNB CHAIN",
  testnet: "TESTNET",
  loading: "LOADING",
  offline: "OFFLINE",
  follow: "FOLLOW",
  footerLine: "// THE FLOOR RISES.",
  disclaimer: "Nothing on this site constitutes financial advice. The floor is backing, not a guaranteed price. Crypto and NFT markets involve risk. Burns are permanent.",

  // nav
  navMint: "MINT",
  navCrack: "CRACK",
  navRedeem: "REDEEM",
  navHow: "HOW IT WORKS",

  // transactions
  txSigning: "Confirm in your wallet…",
  txPending: "Waiting for BNB Chain…",
  txView: "VIEW TRANSACTION",
  approved: "Approved. One more step.",
  connectFirst: "CONNECT WALLET",
  notEnoughBrix: "Not enough $BRIX",
  notEnoughBnb: "Not enough BNB",
  getBrix: "GET $BRIX ON FLAP ›",
  balance: "BALANCE",

  // mint
  mintTitle: "MINT A TRIXSTER",
  mintLead: "2,222 Trixsters on Robinhood Chain, each holding a share of the dowry pot. The mint is open for 7 days from launch.",
  mintPrice: "EACH TRIXSTER",
  mintSplit: "Half the $BRIX burns, half goes to the dowry pot. The BNB buys more $BRIX for the pot.",
  mintHowMany: "HOW MANY?",
  mintTotal: "YOU PAY",
  mintLeft: (n: number) => `${n} left for this wallet (max 50)`,
  mintSoldOutWallet: "This wallet has minted the maximum of 50.",
  mintArrives: "They arrive on Robinhood Chain at the same address,",
  mintArrivesAfter: "within a few minutes.",
  mintSameWhy: "Same wallet on both chains, on purpose: the wallet that holds a Trixster is the one that cracks it and receives its dowry. Nothing to set up, nothing to get wrong.",
  mintApprove: (s: string) => `APPROVE ${s} $BRIX`,
  mintButton: (n: number) => `MINT ${n} TRIXSTER${n > 1 ? "S" : ""}`,
  mintSteps: "Two steps: approve $BRIX once, then mint.",
  mintDone: "Minted. Your Trixsters are on their way to Robinhood Chain.",
  mintClosedBody: "The mint is closed. Trixsters trade on OpenSea.",

  // redeem
  redeemTitle: "BURN FOR THE FLOOR",
  redeemLead: "Redeem burns your $BRIX and pays its share of the BNB reserve, minus 5% left to everyone who stays. Worth it when the market price is below the floor.",
  redeemAmount: "$BRIX TO BURN",
  redeemMax: "MAX",
  redeemGet: "YOU RECEIVE",
  redeemApprove: "APPROVE $BRIX",
  redeemButton: "BURN & REDEEM",
  redeemNote: "Every redeem raises the floor for everyone else.",
  redeemDone: "Redeemed. The BNB is in your wallet.",

  // crack
  crackTitle: "CRACK A TRIXSTER",
  crackLead: "Cracking burns your Trixster on Robinhood Chain for good. Its dowry in $BRIX comes to you on BNB Chain once the burn is confirmed and the waiting period is over.",
  crackYours: "YOUR TRIXSTERS",
  crackNone: "No Trixsters found at this address on Robinhood Chain.",
  crackScanning: "Looking for your Trixsters…",
  crackManual: "Or type the numbers, comma separated: 7 or 7,12,31",
  crackButton: (n: number) => `CRACK ${n} TRIXSTER${n > 1 ? "S" : ""}`,
  crackPick: "Pick the Trixsters to crack",
  crackTooMany: "Up to 50 per transaction.",
  crackBlind: "Dowries are revealed 69 hours after the mint closes. Crack before that and you crack blind.",
  crackEoa: "Crack from a normal wallet (MetaMask, Rabby, Trust…). A multisig such as Safe cannot crack.",
  crackDone: "Crack sent. The relayer burns it on Robinhood Chain within minutes; the dowry follows after the waiting period.",
  dowry: "DOWRY",
  statusConfirmed: "BURNED · PAYING",
  statusPaid: "PAID",
  crackSent: "CRACKING…",
  pendingDowries: (n: number) => `${n} ${n === 1 ? "dowry" : "dowries"} waiting to be paid.`,

  // top burners
  navTop: "TOP BURNERS",
  topTitle: "TOP BURNERS",
  topLead: "Every $BRIX burned, counted for the wallet that burned it: minting, redeeming or burning by hand.",
  topRank: "#",
  topWallet: "WALLET",
  topBurned: "$BRIX BURNED",
  topShare: "OF ALL BURNS",
  topYou: "YOU",
  topNotRanked: "This wallet has not burned any $BRIX yet.",
  topOutside: (n: number) => `This wallet is outside the top ${n}.`,
  topEmpty: "Nobody has burned yet.",
  topPreview: "PREVIEW · NOT PUBLISHED",

  // how it works
  howTitle: "HOW IT WORKS",
  howFloorT: "THE FLOOR",
  howFloorB: "A 3% tax on every trade fills a BNB reserve nobody can withdraw. Floor = reserve ÷ $BRIX still alive. Each burn shrinks the supply, so the floor rises.",
  howMintT: "THE MINT",
  howMintB: "69,000 $BRIX + 0.0069 BNB per Trixster, 7 days, 2,222 max, 50 per wallet. Half the $BRIX burns on the spot, the rest becomes the dowry pot.",
  howRevealT: "THE REVEAL",
  howRevealB: "69 hours after the mint closes, a future block hash shuffles the collection. The weights were locked at launch: nobody, us included, chooses who gets what.",
  howCrackT: "THE CRACK",
  howCrackB: "Burn a Trixster to take its dowry: pot × its weight ÷ all weights. Or keep it: 420 carry no dowry and hold the best art, so they never burn.",
  tiersTitle: "DOWRY WEIGHTS",
  tierEmpty: "EMPTY",
};

type Dict = typeof en;

const zh: Dict = {
  eyebrow: "// BNB 支撑 · 一砖一瓦",
  mantra: "地板价上升。",
  heroSub: "每个 $BRIX 都有 BNB 储备金作为支撑，储备金随交易税不断增长。当价格低于储备金时，与其卖出不如销毁。",
  floorLabel: "地板价 · 每 100 万 $BRIX 对应的 BNB",
  reserve: "储备金",
  supply: "供应量",
  burned: "已销毁",
  pot: "奖励池",
  minted: "已铸造 TRIXSTER",
  mintEndsIn: "铸造剩余时间",
  revealIn: "揭晓倒计时",
  mintClosed: "铸造已结束",
  revealed: "已揭晓",
  connect: "连接钱包",
  wrongChain: "切换到 BNB Chain",
  testnet: "测试网",
  loading: "加载中",
  offline: "离线",
  follow: "关注",
  footerLine: "// 地板价上升。",
  disclaimer: "本网站内容不构成任何投资建议。地板价是储备支撑，并非保证价格。加密货币与 NFT 市场存在风险。销毁不可撤销。",

  navMint: "铸造",
  navCrack: "打碎",
  navRedeem: "赎回",
  navHow: "运作方式",

  txSigning: "请在钱包中确认…",
  txPending: "等待 BNB Chain 确认…",
  txView: "查看交易",
  approved: "授权成功，还差一步。",
  connectFirst: "连接钱包",
  notEnoughBrix: "$BRIX 不足",
  notEnoughBnb: "BNB 不足",
  getBrix: "在 FLAP 购买 $BRIX ›",
  balance: "余额",

  mintTitle: "铸造 TRIXSTER",
  mintLead: "Robinhood Chain 上的 2,222 个 Trixster，每个都对应奖励池的一份。铸造自上线起开放 7 天。",
  mintPrice: "每个 TRIXSTER",
  mintSplit: "一半 $BRIX 被销毁，一半进入奖励池。BNB 将兑换成更多 $BRIX 注入奖励池。",
  mintHowMany: "铸造数量",
  mintTotal: "你需支付",
  mintLeft: (n: number) => `此钱包还可铸造 ${n} 个（最多 50 个）`,
  mintSoldOutWallet: "此钱包已铸造上限 50 个。",
  mintArrives: "Trixster 将发送至 Robinhood Chain 上的同一地址",
  mintArrivesAfter: "几分钟内到账。",
  mintSameWhy: "两条链使用同一个钱包，这是有意设计的：持有 Trixster 的钱包，就是打碎它并领取奖励的钱包。无需任何设置，也不会出错。",
  mintApprove: (s: string) => `授权 ${s} $BRIX`,
  mintButton: (n: number) => `铸造 ${n} 个 TRIXSTER`,
  mintSteps: "两步：先授权 $BRIX，再铸造。",
  mintDone: "铸造成功。你的 Trixster 正在发送至 Robinhood Chain。",
  mintClosedBody: "铸造已结束。Trixster 可在 OpenSea 交易。",

  redeemTitle: "销毁换取地板价",
  redeemLead: "赎回会销毁你的 $BRIX 并支付其对应的 BNB 储备金份额，其中 5% 留给其他持有者。当市场价格低于地板价时更划算。",
  redeemAmount: "要销毁的 $BRIX",
  redeemMax: "最大",
  redeemGet: "你将获得",
  redeemApprove: "授权 $BRIX",
  redeemButton: "销毁并赎回",
  redeemNote: "每一次赎回都会为其他人抬高地板价。",
  redeemDone: "赎回成功。BNB 已发送至你的钱包。",

  crackTitle: "打碎 TRIXSTER",
  crackLead: "打碎会在 Robinhood Chain 上永久销毁你的 Trixster。销毁确认且等待期结束后，其 $BRIX 奖励将发送至你在 BNB Chain 上的地址。",
  crackYours: "你的 TRIXSTER",
  crackNone: "在 Robinhood Chain 上未找到此地址的 Trixster。",
  crackScanning: "正在查找你的 Trixster…",
  crackManual: "或输入编号，用逗号分隔：7 或 7,12,31",
  crackButton: (n: number) => `打碎 ${n} 个 TRIXSTER`,
  crackPick: "选择要打碎的 Trixster",
  crackTooMany: "每笔交易最多 50 个。",
  crackBlind: "奖励在铸造结束 69 小时后揭晓。在此之前打碎，就是盲打。",
  crackEoa: "请使用普通钱包打碎（MetaMask、Rabby、Trust…）。Safe 等多签钱包无法打碎。",
  crackDone: "打碎请求已发送。中继将在几分钟内于 Robinhood Chain 上销毁，等待期结束后发放奖励。",
  dowry: "奖励",
  statusConfirmed: "已销毁 · 待发放",
  statusPaid: "已发放",
  crackSent: "打碎中…",
  pendingDowries: (n: number) => `${n} 份奖励等待发放。`,

  navTop: "销毁榜",
  topTitle: "销毁排行榜",
  topLead: "每一个被销毁的 $BRIX 都计入执行销毁的钱包：铸造、赎回或手动销毁。",
  topRank: "#",
  topWallet: "钱包",
  topBurned: "已销毁 $BRIX",
  topShare: "占总销毁",
  topYou: "你",
  topNotRanked: "此钱包尚未销毁任何 $BRIX。",
  topOutside: (n: number) => `此钱包未进入前 ${n} 名。`,
  topEmpty: "还没有人销毁。",
  topPreview: "预览 · 未发布",

  howTitle: "运作方式",
  howFloorT: "地板价",
  howFloorB: "每笔交易 3% 的税费注入 BNB 储备金，任何人都无法提取。地板价 = 储备金 ÷ 尚未销毁的 $BRIX。每次销毁都会减少供应量，地板价随之上升。",
  howMintT: "铸造",
  howMintB: "每个 Trixster 需 69,000 $BRIX + 0.0069 BNB，开放 7 天，总量 2,222 个，每个钱包最多 50 个。一半 $BRIX 当场销毁，其余进入奖励池。",
  howRevealT: "揭晓",
  howRevealB: "铸造结束 69 小时后，由未来区块的哈希打乱整个系列。权重在上线时已锁定：包括我们在内，没有人能决定谁得到什么。",
  howCrackT: "打碎",
  howCrackB: "销毁 Trixster 即可领取其奖励：奖励池 × 其权重 ÷ 总权重。也可以保留：420 个没有奖励、但拥有最好的图像，它们永远不会被销毁。",
  tiersTitle: "奖励权重",
  tierEmpty: "无奖励",
};

export type Lang = "en" | "zh";
const DICTS: Record<Lang, Dict> = { en, zh };
const LangContext = createContext<{ lang: Lang; t: Dict; setLang: (l: Lang) => void }>({
  lang: "en", t: en, setLang: () => {},
});

// The choice lives in localStorage; the static export renders English first.
const listeners = new Set<() => void>();
function readLang(): Lang {
  try {
    const saved = localStorage.getItem("brix-lang");
    if (saved === "en" || saved === "zh") return saved;
  } catch { /* storage unavailable */ }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);

  useEffect(() => { document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; }, [lang]);

  const setLang = (l: Lang) => {
    try { localStorage.setItem("brix-lang", l); } catch { /* ignore */ }
    listeners.forEach((cb) => cb());
  };

  return <LangContext.Provider value={{ lang, t: DICTS[lang], setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
