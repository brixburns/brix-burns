# $BRIX

Backed by BNB. Brix by brix.

This repository contains the source code of [brix-burns.com](https://brix-burns.com), the official site for the $BRIX token and the Trixster collection.

## What is this

- **$BRIX** is a token on BNB Chain, launched on Flap. About 87% of the 3% tax on every trade fills a BNB reserve that nobody can withdraw. Anyone can burn $BRIX and take their share of it (redeem): the floor per $BRIX only rises.
- **Trixster** is a collection of 2,222 NFTs on Robinhood Chain, minted with $BRIX: half of it burns, half fills a dowry pot. Crack a Trixster to take its dowry; it burns for good.

Official contract addresses are published on the site at launch, and only there.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, static export → GitHub Pages)
- [viem](https://viem.sh) + [wagmi](https://wagmi.sh), browser wallets
- Network and addresses in `app/lib/chain.ts`: testnet by default, mainnet with `NEXT_PUBLIC_NETWORK=mainnet` (set by the deploy workflow). Until the mainnet addresses are filled in, the site shows its pre-launch version.
- Texts in English and Chinese in `app/lib/i18n.tsx`.

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

**Disclaimer**: This codebase is provided as-is. Nothing in this repository constitutes financial advice. The floor is backing, not a guaranteed price. Cryptocurrency and NFT markets involve risk. Burns are permanent.
