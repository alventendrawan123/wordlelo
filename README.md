# Wordlelo

A daily word-guessing game built on **Celo**. Guess the 5-letter word in 6 tries — with on-chain streaks, leaderboards, and rewards.

> An original word game inspired by the genre. Not affiliated with or endorsed by The New York Times.

## Stack

| Layer | Tech |
|---|---|
| Smart contracts | Solidity + Foundry, deployed on Celo (Alfajores → Mainnet) |
| Backend | Fastify + Drizzle + Postgres (daily word authority, guess validation) |
| Frontend | Next.js (app router) + wagmi v2 / viem v2, PWA (MiniPay-ready) |
| Tooling | pnpm workspaces, Biome |

## Team

| Role | Owner |
|---|---|
| Backend + Smart Contracts | — |
| Frontend | Bima |

## How it works (high level)

The daily word is held server-side; the backend validates each guess and computes
the green/yellow/gray feedback. Game *results* (win/loss, guess count, streak) are
settled on-chain — the secret word itself is never written to the chain until the
day's commit–reveal, so the puzzle stays fair and the result stays verifiable.

## Deployed contracts (Celo mainnet)

| | Address |
|---|---|
| `WordleGame` (proxy) | [`0x1b444313a61be61830d4983dCe350A018C288600`](https://celoscan.io/address/0x1b444313a61be61830d4983dCe350A018C288600) |
| Implementation | `0x31F26f77F73dBB7ac9A03415D73d46AE81CF8af1` |

UUPS-upgradeable — always interact with the **proxy**. The ABI and addresses are
published from the `@wordlelo/contracts` package for the backend and frontend:

```ts
import { wordleGameAbi, WORDLE_GAME_ADDRESS } from "@wordlelo/contracts";
```

## Getting started

```bash
pnpm install
# contracts
cd sc/contracts && forge test
# backend
cd backend && pnpm dev
# frontend
cd frontend && pnpm dev
```

## License

MIT
