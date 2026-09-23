import { bsc, bscTestnet, robinhood, robinhoodTestnet } from "viem/chains";

// ── NETWORK ──────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_NETWORK=mainnet at launch. Until then the site reads the long
// testnet run (BRIX VAULT/testnet/deployment.json).
const NETWORK = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";

const NETWORKS = {
  testnet: {
    chain: bscTestnet,
    rpc: "https://bsc-testnet-rpc.publicnode.com",
    token: "0x6a33B7E96370307BB58B6e0120155F0FCAC07777",
    vault: "0x4700b865d5498CF13258D0f2fDe7499995B6cfB7",
    trixster: "0x306cc9acb4f24e0217059fcf2c39bd6aa2dd4f89",
    rhChain: robinhoodTestnet,
    rhRpc: "https://rpc.testnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer-testnet.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners-testnet.420losrs.workers.dev/top",
    portal: "0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9",
    opensea: "", // collection page, once it exists
    flap: "https://testnet.flap.sh/bnb-testnet/0x6a33B7E96370307BB58B6e0120155F0FCAC07777",
  },
  mainnet: {
    chain: bsc,
    rpc: "https://bsc-dataseed.bnbchain.org",
    token: "",
    vault: "",
    trixster: "",
    rhChain: robinhood,
    rhRpc: "https://rpc.mainnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners.420losrs.workers.dev/top",
    portal: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0", // recon-flap-bsc.md
    opensea: "",
    flap: "", // https://flap.sh/bnb/<token>
  },
} as const;

export const NET = NETWORKS[NETWORK];
export const IS_TESTNET = NETWORK === "testnet";

// Flap tokens launch with a fixed 1B supply: burned = this − effectiveSupply().
export const INITIAL_SUPPLY = 1_000_000_000n * 10n ** 18n;
export const MAX_TRIXSTERS = 2222;

// Mint terms, constants in BrixVault.sol.
export const MINT_BRIX = 69_000n * 10n ** 18n;
export const MINT_FEE = 6_900_000_000_000_000n; // 0.0069 BNB
export const MAX_PER_WALLET = 50;
export const MAX_PER_CRACK = 50;

// Top Burners: tracked, not shown (decided 21/09). Visible under `npm run dev`
// only, to review it; set to true to publish it.
export const SHOW_TOP_BURNERS = process.env.NODE_ENV === "development";
