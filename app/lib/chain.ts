import { bsc, bscTestnet, robinhood, robinhoodTestnet } from "viem/chains";

// ── NETWORK ──────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_NETWORK=mainnet at launch. Until then the site reads the current
// testnet deploy (BRIX VAULT/testnet/deployment.json).
const NETWORK = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";

const NETWORKS = {
  testnet: {
    chain: bscTestnet,
    rpc: "https://bsc-testnet-rpc.publicnode.com",
    // the stress test of 26/09 (BRIX VAULT/deploy/testnet.json), the one the testnet workers run on
    token: "0x5e075B335d49cf9e83900b9E1f90C13ADC3f7777",
    vault: "0x3195D3167c3569244C4E8a3C688264812cE3491a",
    trixster: "0x12597cb9ba7ed2e6a788057f43387f1e971e9008",
    creatorShare: "0xce531032c7158df9ffd316b59707c3d1f8b2a4a1",
    devLock: "0x49f94745722a2c7fa3832786ac7f64815fb9cfc1",
    rhChain: robinhoodTestnet,
    rhRpc: "https://rpc.testnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer-testnet.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners-testnet.420losrs.workers.dev/top",
    portal: "0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9",
    opensea: "", // collection page, once it exists
    burnWithBnb: true,
    flap: "https://testnet.flap.sh/bnb-testnet/0x5e075B335d49cf9e83900b9E1f90C13ADC3f7777",
  },
  mainnet: {
    chain: bsc,
    rpc: "https://bsc-dataseed.bnbchain.org",
    token: "0xc0e9899c790BCFdE93C8507Fa9f43cb8a8717777",
    vault: "0x372413C6138e9294B23AF4C2AAa7EAbc8D48996d",
    trixster: "0xce2362f396999595de64109d7cff070734e85755",
    creatorShare: "0xcd7893086fa480f9d0f8b84f971fddf86da64782",
    devLock: "0xc35e212b4a503678878cebfd5770cf1bd2abde71", // TokenLock: 80% of the 1% dev reserve, published at launch
    rhChain: robinhood,
    rhRpc: "https://rpc.mainnet.chain.robinhood.com",
    relayerStatus: "https://brix-relayer.420losrs.workers.dev/status",
    burnersTop: "https://brix-burners.420losrs.workers.dev/top",
    portal: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0", // recon-flap-bsc.md
    opensea: "https://opensea.io/collection/trixster-burns",
    flap: "https://flap.sh/bnb/0xc0e9899c790BCFdE93C8507Fa9f43cb8a8717777", // https://flap.sh/bnb/<token>
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
