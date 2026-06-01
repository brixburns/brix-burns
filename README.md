# $BRIX

A Solana token engineered to burn itself out of existence. The goal is zero supply.

This repository contains the source code of [brix-burns.com](https://brix-burns.com) — the official site for the $BRIX token and TRIXSTER NFT collection.

## What is this

- **$BRIX** — Solana SPL token with a deflationary mechanic. Every NFT mint, every secondary sale, and every trading fee feeds the burn.
- **TRIXSTER** — Collection of 3,333 NFTs whose minting destroys $BRIX. The NFTs are the mechanism; the burn is the mission.
- Target: 90% of supply destroyed.

Full documentation: [`/docs.html`](https://brix-burns.com/docs.html)

## Stack

- [Next.js 16](https://nextjs.org) (App Router, static export → GitHub Pages)
- [Solana web3.js](https://github.com/solana-labs/solana-web3.js) + [Metaplex Core Candy Machine](https://developers.metaplex.com/core-candy-machine)
- [Wallet Adapter](https://github.com/anza-xyz/wallet-adapter) (Phantom and others, autodetected via Wallet Standard)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Build

```bash
npm run build
```

Outputs a fully static site to `out/` ready for deployment.

## Links

- Site: [brix-burns.com](https://brix-burns.com)
- X: [@BRIX_burns](https://x.com/BRIX_burns)

---

**Disclaimer**: This codebase is provided as-is. Nothing in this repository constitutes financial advice. Cryptocurrency and NFT markets involve risk. Burns are permanent. Mint payments are final.
