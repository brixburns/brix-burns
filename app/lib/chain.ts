import { bsc, bscTestnet, robinhood, robinhoodTestnet } from "viem/chains";

// ── NETWORK ──────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_NETWORK=mainnet at launch. Until then the site reads the current
// testnet deploy (BRIX VAULT/testnet/deployment.json).
const NETWORK = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";

const NETWORKS = {
  testnet: {
    chain: bscTestnet,
    rpc: "https://bsc-testnet-rpc.publicnode.com",
    // the 24/09 deploy ("stress"), the one the testnet workers run on
    token: "0xCe3ab65e67873B4F3186CB882B5fd961A00f7777",
    vault: "0xc30e3de612D1B9B5416efD6135f1F324F6239dCF",
    trixster: "0x073632ae1e737f87629e27ed8f814d6f83b16f50",
    creatorShare: "0x5bd24ebe03ebe8d5cd9777cde0442f7379fc0a69",
    rhChain: robinhoodTestnet,
    rhRpc: "https://rpc.testnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer-testnet.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners-testnet.420losrs.workers.dev/top",
    portal: "0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9",
    opensea: "", // collection page, once it exists
    burnWithBnb: true,
    flap: "https://testnet.flap.sh/bnb-testnet/0xCe3ab65e67873B4F3186CB882B5fd961A00f7777",
  },
  mainnet: {
    chain: bsc,
    rpc: "https://bsc-dataseed.bnbchain.org",
    token: "",
    vault: "",
    trixster: "",
    creatorShare: "",
    rhChain: robinhood,
    rhRpc: "https://rpc.mainnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners.420losrs.workers.dev/top",
    portal: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0", // recon-flap-bsc.md
    opensea: "",
    flap: "", // https://flap.sh/bnb/<token>
    burnWithBnb: true,
  },
} as const;

export const NET = NETWORKS[NETWORK];
export const IS_TESTNET = NETWORK === "testnet";

// Before launch the mainnet vault doesn't exist: the site shows what $BRIX is,
// the FAQ and the socials, and hides everything that reads or writes on-chain.
// Filling the mainnet addresses above switches it on, nothing else to do.
export const PRELAUNCH = !NET.vault;

// Flap tokens launch with a fixed 1B supply: burned = this − effectiveSupply().
export const INITIAL_SUPPLY = 1_000_000_000n * 10n ** 18n;
export const MAX_TRIXSTERS = 2222;

// Mint terms, constants in BrixVault.sol.
export const MINT_BRIX = 69_000n * 10n ** 18n;
export const MINT_FEE = 6_900_000_000_000_000n; // 0.0069 BNB
export const MAX_PER_WALLET = 50;
export const MAX_PER_CRACK = 50;
