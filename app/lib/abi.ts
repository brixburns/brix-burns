import { parseAbi } from "viem";

// The slice of BrixVault the site uses (BRIX VAULT/contracts/src/BrixVault.sol).
export const vaultAbi = parseAbi([
  "function floor() view returns (uint256)",
  "function reserve() view returns (uint256)",
  "function effectiveSupply() view returns (uint256)",
  "function previewRedeem(uint256 amount) view returns (uint256)",
  "function potBrix() view returns (uint256)",
  "function potBnb() view returns (uint256)",
  "function minted() view returns (uint256)",
  "function mintedBy(address) view returns (uint256)",
  "function mintStart() view returns (uint64)",
  "function mintOpen() view returns (bool)",
  "function MINT_WINDOW() view returns (uint256)",
  "function REVEAL_DELAY() view returns (uint256)",
  "function PAYOUT_DELAY() view returns (uint256)",
  "function shuffleBlock() view returns (uint256)",
  "function shuffled() view returns (bool)",
  "function finalized() view returns (bool)",
  "function dowryOf(uint256 tokenId) view returns (uint256)",
  "function cracks(uint256 tokenId) view returns (address payTo, uint64 confirmedAt, bool paid, bool vetoed)",
  "function mint(uint256 brix) payable returns (uint256 firstId)",
  "function crack(uint256[] tokenIds)",
  "function redeem(uint256 amount) returns (uint256 paid)",
  "function burnWithBnb(uint256 minBrix) payable returns (uint256 burned)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

// Flap Portal: price on the bonding curve, in BNB (18 decimals).
// status: 1 = trading on the curve, 4 = graduated to the DEX.
export const portalAbi = parseAbi([
  "function getTokenV2(address token) view returns (uint8 status, uint256 reserve, uint256 circulatingSupply, uint256 price, uint8 tokenVersion, uint256 r, uint256 dexSupplyThresh)",
]);

// TokenLock: the dev reserve, locked until a fixed date. No owner, no early release.
export const lockAbi = parseAbi([
  "function locked() view returns (uint256)",
  "function unlockAt() view returns (uint256)",
  "function beneficiary() view returns (address)",
]);

// Trixster on Robinhood Chain: not enumerable, so ownership is read id by id.
export const trixsterAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
