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
