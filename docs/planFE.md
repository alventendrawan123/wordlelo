# Wordlelo — Frontend Plan (for Bima)

> **Audience:** Bima (frontend dev). This plan is the output of auditing the **live** smart
> contract, the backend design, and the target game UX. It tells you exactly what to build,
> in what order, and how to wire it to the Celo contract that is **already deployed + verified
> on mainnet**.

---

## TL;DR

- **What we're building:** a faithful **Wordle clone** (5-letter word, 6 guesses, one daily
  puzzle) that settles results on **Celo mainnet**.
- **Already done (rely on it):** the `WordleGame` contract is **live + verified on Celo
  mainnet**, and its ABI + address ship in the **`@wordlelo/contracts`** workspace package.
- **Your job:** build the **`fe/`** Next.js app — the game UI, the MiniPay/wallet integration,
  and the result-submission flow.
- **Backend isn't built yet:** **mock** the BE API (spec in §2) behind one `gameApi` module and
  flip a flag when the real BE lands. Keep the request/response **types identical** so the swap
  is a one-line base-URL change.

**Live contract:** proxy `0x1b444313a61be61830d4983dCe350A018C288600` ·
[Celoscan](https://celoscan.io/address/0x1b444313a61be61830d4983dCe350A018C288600#code) · chain `42220`.

---

## Architecture — how the pieces fit

The chain layer is **invisible during play**; it only surfaces when settling the result.

```
        ┌─────────────┐   guess         ┌──────────────┐
        │   FE (you)  │ ───────────────▶│  Backend     │  holds the SECRET word
        │  Next.js    │ ◀─────────────── │  (authority) │  → returns green/yellow/gray
        │             │   marks[]        │              │
        │             │   on win/lose    │              │
        │             │ ───────────────▶│  attestation │  → SETTLER-signs an ECDSA proof
        │             │ ◀─────────────── │              │
        └─────┬───────┘   { signature }  └──────────────┘
              │ submitResult(day,guesses,won,hardMode, signature)   ← player's OWN wallet tx
              │ (MiniPay, type:"legacy")                              ← real on-chain DAU
              ▼
        ┌─────────────────────────────┐
        │  WordleGame (Celo mainnet)  │  verifies the SETTLER signature, records result+streak
        └─────────────────────────────┘
```

**Why this shape**
- **Backend-authoritative** — the word + scoring live server-side, so the FE can't cheat and
  never holds the answer.
- **Commit–reveal** — the contract stores a hash of the day's word up front; the word is only
  revealed after the day closes → provably fair.
- **Option B (player submits their own tx with a backend attestation)** — each genuine player
  is a real on-chain transaction = honest DAU for Proof-of-Ship (not bot-farmed).

---

## What's ready now vs. what you mock

| Layer | Status | What you do |
|---|---|---|
| `WordleGame` contract (Celo mainnet, **verified**) | ✅ live | call it via `@wordlelo/contracts` |
| `@wordlelo/contracts` (ABI + address) | ✅ published | `import { … }` — never copy-paste an ABI |
| Backend API (`/api/v1/*`) | ❌ scaffold only (`/health`) | **mock** behind one `gameApi` module (§2), flip `USE_REAL_BE` later |

You can build and ship a **fully playable game** against the mock BE before the backend exists.

---

## 1. Smart contract interface (LIVE — Celo mainnet)

Everything you need is exported from the workspace package — **do not copy the ABI**:

```ts
import {
  wordleGameAbi,
  WORDLE_GAME_ADDRESS,   // proxy on Celo mainnet (the address you call)
  CELO_MAINNET,          // 42220
  deployments,           // { 42220: { proxy, implementation, deployBlock, … } }
  wordleGameAddress,     // (chainId) => proxy address
} from "@wordlelo/contracts";
```

> Always interact with the **proxy** (`WORDLE_GAME_ADDRESS`). It's UUPS — the implementation can
> change, the proxy address is stable.

### The one WRITE call you make: `submitResult`

```solidity
function submitResult(uint256 day, uint8 guesses, bool won, bool hardMode, bytes sig)
```

- Called from the **player's wallet** after they finish a game. `sig` is the **SETTLER
  attestation** you fetch from the backend (§2.3) — you don't build it, you just relay it.
- **MUST be sent as `type: "legacy"`** (MiniPay ignores EIP-1559 — a non-legacy tx hangs/fails).

```ts
const hash = await walletClient.writeContract({
  address: WORDLE_GAME_ADDRESS,
  abi: wordleGameAbi,
  functionName: "submitResult",
  args: [day, guesses, won, hardMode, signature], // exactly the BE's tx.args
  type: "legacy", // ⚠️ REQUIRED for MiniPay
});
```

It can revert with these custom errors (you rarely hit them if the BE attestation is correct):
`InvalidGuesses(uint8)`, `NotCommitted(uint256)`, `AlreadySubmitted(uint256)`,
`InvalidAttestation()`, `OutOfOrder(uint256,uint256)`, plus `EnforcedPause()`.
**Treat `AlreadySubmitted` as success** ("already recorded"), not an error.

On-chain rules to respect: one result per `(player, day)`; days submitted strictly increasing
per player; `guesses` in `1..6`; contract must not be paused.

### READ calls (for stats / verification)

Use a raw viem `PublicClient` against Forno (don't route reads through wagmi):

```ts
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
const pub = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

const streak = await pub.readContract({
  address: WORDLE_GAME_ADDRESS, abi: wordleGameAbi,
  functionName: "getStreak", args: [player],
}); // → { current: number, max: number, lastDay: bigint }
```

| Function | Returns | Use |
|---|---|---|
| `getStreak(player)` | `{ current, max, lastDay }` | header streak badge, stats modal |
| `getResult(player, day)` | `{ guesses, won, hardMode, at }` | "did this player already settle today?" |
| `isRevealed(day)` | `bool` | show the answer / verify after close |
| `revealedWord(day)` | `string` | post-reveal verification |
| `wordCommit(day)` | `bytes32` | "provably fair" hash to display |

Events worth indexing later: `WordCommitted(day, commitment)`,
`WordRevealed(day, word)`, `ResultSubmitted(player, day, guesses, won, hardMode)`.

---

## 2. Backend API (contract the FE depends on)

Base URL `/api/v1`, JSON bodies. Auth via SIWE session — `Authorization: Bearer <jwt>`.
**The daily word is never returned by any endpoint until the day closes + is revealed on-chain.**

Conventions:
- `day` is an integer day index = whole UTC days since the Wordlelo epoch; it matches the
  `uint256 day` on-chain. **The FE treats it as opaque and always reads it from the server** —
  never compute your own `day` for the on-chain key.
- Errors: `{ "error": { "code": "STRING_CODE", "message": "…" } }`. Codes to handle:
  `INVALID_GUESS` (400), `NOT_IN_WORD_LIST` (422), `GAME_ALREADY_COMPLETE` (409),
  `TOO_MANY_GUESSES` (409), `UNAUTHORIZED` (401), `RATE_LIMITED` (429).

### Auth / SIWE — MVP

`GET /api/v1/auth/nonce?address=0x…` → `{ "nonce": "8f3c…", "issuedAt": "…Z" }`

`POST /api/v1/auth/verify` → req `{ "message": "<SIWE message>", "signature": "0x…" }` →
`{ "token": "<jwt>", "address": "0xPlayer…", "expiresAt": "…Z" }`
- SIWE message embeds `chainId: 42220` + the server nonce; FE signs with **`personal_sign`**
  (silent in MiniPay). Server recovers + checks nonce + issues the JWT. All game endpoints
  require this token.

### 2.1 Daily puzzle meta — MVP

`GET /api/v1/puzzle/today` (auth → `status` is player-specific)
```json
{
  "day": 20243, "wordLength": 5, "maxGuesses": 6, "hardModeAllowed": true,
  "opensAt": "2026-06-04T00:00:00Z", "closesAt": "2026-06-05T00:00:00Z",
  "commitment": "0x<keccak256(word,salt)>",
  "status": {
    "state": "in_progress", "guessesUsed": 2, "remaining": 4,
    "won": false, "completed": false, "hardMode": false,
    "board": [
      { "guess": "CRANE", "marks": ["gray","yellow","gray","green","gray"] },
      { "guess": "SLOTH", "marks": ["gray","gray","green","gray","gray"] }
    ]
  }
}
```
- `state` ∈ `not_started | in_progress | won | lost`. `commitment` = on-chain `wordCommit[day]`
  (show "provably fair"; verify post-reveal). `board` rehydrates an in-progress game after reload.
  **Never returns the word.** Use `closesAt` to drive the next-puzzle countdown.

### 2.2 Submit a guess — MVP

`POST /api/v1/puzzle/today/guess` → req `{ "guess": "SLOTH", "hardMode": false }` →
```json
{ "day": 20243, "guess": "SLOTH", "marks": ["gray","gray","green","gray","gray"],
  "guessesUsed": 2, "remaining": 4, "completed": false, "won": false }
```
- Server is **authoritative for scoring** (proper two-pass algorithm). `marks[i]` ∈
  `green | yellow | gray`. The FE renders exactly what the server returns and **never scores
  locally in production**.
- Validation → `INVALID_GUESS` / `NOT_IN_WORD_LIST` / `GAME_ALREADY_COMPLETE` / `TOO_MANY_GUESSES`.
- When `completed: true`, this is your signal to call the attestation endpoint. The word is
  still **not** in the response — only `won` / `completed`.
- `hardMode` is locked to the first guess's value for the day.

### 2.3 Completion attestation (SETTLER signature) — MVP

`POST /api/v1/puzzle/today/attestation` (auth, empty body) →
```json
{
  "attestation": { "player":"0x…","day":20243,"guesses":4,"won":true,"hardMode":false,
    "contract":"0xWordleGameProxy…","chainId":42220,"signature":"0x…65byteECDSA" },
  "tx": { "functionName":"submitResult", "args":[20243, 4, true, false, "0x…signature"] }
}
```
- Issued **only once the player's game is genuinely `completed` server-side** (else `409
  GAME_INCOMPLETE`) → wins are unforgeable.
- The signature is exactly what the contract verifies:
  `SETTLER.sign( toEthSignedMessageHash( keccak256(abi.encodePacked(player, day, guesses, won, hardMode, contract, chainId)) ) )`.
  The **FE never reconstructs the digest** — it just relays `tx.args` straight into
  `writeContract` (as a **legacy** tx).
- Idempotent: same completed day → same signature.

### 2.4 Later (not MVP)
- `GET /api/v1/puzzle/{day}/reveal` → `{ word, salt, commitment, revealedOnChain, txHash }`
  (only after close; lets you prove `keccak256(word,salt) == commitment`).
- `GET /api/v1/me/results`, `GET /api/v1/me/streak`, `GET /api/v1/leaderboard?day=…`.

### Mocking while the BE is `/health`-only
Put **all** BE calls behind one `gameApi` module. Stub `puzzle/today`, score guesses locally
against a hardcoded dev word, return a dummy attestation. Gate the real `writeContract` behind a
`USE_REAL_BE` flag (a dummy sig reverts on-chain). Keep the **types identical** to this spec →
swapping to the real BE is a base-URL change. **Never ship the answer list or scoring logic to
the client in production** — that's the whole point of backend-authoritative; local scoring is a
dev-only mock.

---

## 3. Celo & MiniPay integration (FE requirements)

### Chain config
- Target **Celo Mainnet `42220`**; dev/QA on **Alfajores `44787`**.
- RPC: `https://forno.celo.org` (mainnet) / `https://alfajores-forno.celo-testnet.org`. Reads via
  a raw viem `PublicClient`. Forno rate-limits parallel reads >~50/sec — **don't tight-poll**;
  batch/debounce board + stats reads.
- Explorer deep-links: **Celoscan** (`https://celoscan.io/tx/<hash>`, `/address/<addr>`); ship an
  `ExplorerTxLink` / `AddressLink` helper that picks the base URL from the active `chainId`.
- The wallet may already be pinned to 42220 inside MiniPay — **don't force `switchChain` on load**;
  render a network badge and only nudge if `chainId` is wrong.

### MiniPay detection + auto-connect (no connect button)
- Detect: `window.ethereum?.isMiniPay === true` (+ a `?minipay=1` URL override for desktop QA).
- Inside MiniPay there must be **NO "Connect Wallet" button** — auto-connect via the injected
  connector on first paint (in an effect, once detection passes).
- Guard double-prompting: only `connectAsync` if not already connected **and** not already
  authenticated (`isAuthenticated` / valid JWT) — prevents re-firing SIWE on in-app navigations.
- Outside MiniPay (desktop), a normal connect button is fine.

### Transactions — `type: "legacy"` is mandatory
- Every **wallet-side** tx (`submitResult`) MUST be `type: "legacy"`. MiniPay ignores EIP-1559;
  a non-legacy tx fails/hangs. **Centralize this in one tx helper** so it can't be forgotten.
- Default `feeCurrency` to native **CELO** (any CELO balance just works); don't bother with USDT
  fee currency. Don't hardcode gas price — let the wallet estimate; Celo baseFee can spike to
  200+ gwei for hours, so surface a "network busy, retry" state instead of failing silently.

### Signing — `personal_sign` only, avoid EIP-712
- SIWE login uses **`personal_sign`** (silent in MiniPay). **Do NOT use `signTypedData`/EIP-712
  anywhere** — it hangs/fails silently across MiniPay versions. The result flow is designed so the
  player **never signs the result**: the **backend** signs the attestation; the player only relays
  it via a plain `writeContract`. No typed-data signing is ever required.

### Session/UI gating
- Gate authenticated UI on **`isConnected || isAuthenticated`**, not `isConnected` alone — wagmi's
  `isConnected` briefly flips false during in-app navigations even with a valid JWT.

### PWA / MiniPay listing requirements
- Serve from the **root**: `/icon-512.png` (512×512), `/manifest.json` (valid manifest referencing
  it), plus `/terms` and `/privacy` pages — required by the MiniPay mini-app listing form
  (`developer.minipay.to/mini-app-listing`). Make it installable-PWA-compliant (manifest + icon +
  service worker via `next-pwa`). (Known mid-2026 listing-form CORS bug: the *submit* step may need
  Chrome with `--disable-web-security` for that one submission — not a runtime concern.)

### Recommended web3 module layout (mirrors the prior Celo build)
- `lib/web3/network.ts` — chain metadata + explorer URL builders.
- `lib/web3/minipay.ts` — `isMiniPay()` + auto-connect helper.
- `hooks/useMiniPay.ts` — detection + auto-connect + `isConnected || isAuthenticated` gating in one hook.
- `NetworkBadge`, `OnChainBadge`, `AddressLink`, `ExplorerTxLink` components.

---

## 4. Game UX (faithful to NYT Wordle)

The game must feel indistinguishable from NYT Wordle in moment-to-moment play.

**Board** — a **6×5** grid. Tile states: `empty`, `filled` (typed, border pop), `revealed`
(green/yellow/gray), plus a current-row highlight. Active row = topmost unfilled; type fills L→R,
Backspace deletes, Enter submits.

**Input** — on-screen **QWERTY** (`QWERTYUIOP` / `ASDFGHJKL` / `Enter ZXCVBNM Backspace`, action
keys widened) + a global `keydown` listener for the physical keyboard. **Lock input** when a modal
is open, the game is over, or a row reveal animation is in flight.

**Feedback & the 2-PASS duplicate-letter algorithm** — `green` > `yellow` > `gray`. Two passes:
1. **Greens first:** for each `i`, if `guess[i] === answer[i]` → green, and **decrement that
   letter's remaining count** from a tally of the answer's letters.
2. **Yellows from the remainder:** for each non-green position, if the guessed letter still has
   remaining count > 0 → yellow (decrement); else gray.

This is why a second copy of a letter goes gray once the answer's supply is exhausted (e.g. guess
`ALLEY` vs answer `LOLLY`). **The backend is authoritative** — the FE may run the same 2-pass
`evaluate()` **optimistically** to flip tiles instantly, but **reconciles against the BE's
returned `marks`** (the BE holds the word). If they disagree, the authoritative pattern wins.

**Animations** — tile **flip** on reveal (`rotateX`, staggered ~100ms L→R, input locked until the
last settles); row **shake** on invalid/short word (no tiles consumed); **bounce** on a winning
row after the flip. Respect `prefers-reduced-motion` (collapse to instant).

**Keyboard coloring (never downgrade)** — color each key by the best status that letter ever
achieved: green > yellow > gray. Maintain a per-letter "best status" map; green never drops.

**Toasts** — "Not in word list", "Not enough letters", hard-mode violations, end-of-game (answer
on loss, praise word on win).

**Stats modal** — Played, Win %, Current streak, Max streak, guess-distribution bar chart (1–6,
highlight the latest win's row). Opens after game end + from a header icon. Hydrate from on-chain
`streaks`/`results` when a wallet is connected; fall back to localStorage otherwise.

**Countdown** — live `HH:MM:SS` to the next daily reset (use the BE's `closesAt`). At zero, reset
to a fresh board.

**Share** — copies the spoiler-free grid: `Wordlelo <day#> <guesses>/6` (`*` for hard mode) + emoji
rows (green/yellow/gray, or orange/blue in colorblind mode). **No letters ever leaked.**

**Themes & a11y** — dark mode (default to system, toggleable, persisted); colorblind/high-contrast
palette (green/yellow → orange/blue across tiles, keyboard, share); ARIA on tiles (letter +
evaluation) and a labeled grid.

**Hard mode** — revealed hints must be reused (greens stay in place, yellows must appear);
violations → shake + toast + blocked submit. Toggle only before the first guess; the `hardMode`
flag is sent to the BE and recorded on-chain in `submitResult`.

**Daily reset & persistence** — one puzzle/day; drive the countdown off `closesAt`. **localStorage**
(namespaced per day) persists in-progress rows, evaluations, keyboard state, status, and settings;
on load, rehydrate if the stored day matches today, else archive into stats and start fresh — a
mid-day refresh never loses progress.

---

## 5. Recommended stack

A new **`fe/`** package in the existing pnpm workspace, depending on `@wordlelo/contracts`.

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** | static shell/SEO; the game is a client island; PWA-installable |
| Wallet / chain | **wagmi v2 + viem v2** | celo `42220` / alfajores `44787` chains from viem |
| Wallet UX | **MiniPay-first** (injected), WalletConnect/injected fallback | auto-connect on injected detection |
| Tx rule | **`type: "legacy"` on every wallet write** | centralize in one helper |
| PWA | **next-pwa** (Workbox) | installable, MiniPay-ready manifest; never cache a secret word (FE has none) |
| Styling | Tailwind + CSS variables | CSS vars drive light/dark/colorblind; keyframes for flip/shake/bounce |
| Lint/format | **Biome** | reuse the root `@biomejs/biome@1.9.4` + root `format`/`lint` scripts |
| Pkg manager | **pnpm workspaces** (`pnpm@10.30.3`) | `fe/` is a member like `be/` |
| ABI/addr | **`@wordlelo/contracts`** (`workspace:*`) | no ABI copy-paste |

**Monorepo fit (required change).** Extend `pnpm-workspace.yaml`:
```yaml
packages:
  - "be"
  - "fe"        # ← add
  - "packages/*"
```
Name the package **`@wordlelo/fe`** (mirrors `@wordlelo/be`), `private: true`, dep
`"@wordlelo/contracts": "workspace:*"`, standard `dev`/`build`/`start`/`typecheck` scripts. Add
root scripts next to the `be:*` ones:
```jsonc
"fe:dev":   "pnpm --filter @wordlelo/fe dev",
"fe:build": "pnpm --filter @wordlelo/fe build"
```
Linting/formatting stays centralized at the root (`pnpm format`, `pnpm lint`).

---

## 6. Project structure & components

```
fe/
├── package.json                # @wordlelo/fe — next, react, wagmi, viem, next-pwa, @wordlelo/contracts (workspace:*)
├── next.config.mjs             # withPWA(); transpilePackages: ["@wordlelo/contracts"]
├── tsconfig.json
├── .env.local.example          # NEXT_PUBLIC_BE_URL, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_WC_PROJECT_ID
├── public/
│   ├── manifest.webmanifest    # PWA manifest (MiniPay-ready)
│   └── icons/                  # icon-512.png + favicons
└── src/
    ├── app/
    │   ├── layout.tsx          # html shell, <Providers>, no-flash dark-mode bootstrap
    │   ├── page.tsx            # mounts <GameScreen/> (client island)
    │   └── globals.css         # CSS vars (palettes) + flip/shake/bounce keyframes
    ├── components/
    │   ├── game/  { GameScreen, Board, Row, Tile, Keyboard, Key }
    │   ├── modals/{ Modal, StatsModal, HelpModal, SettingsModal }
    │   ├── feedback/{ Toast, ToastProvider }
    │   ├── share/ { ShareButton }       # spoiler-free emoji grid → clipboard/Web Share
    │   ├── stats/ { GuessDistribution }
    │   ├── web3/  { Providers, wagmiConfig, ConnectButton, NetworkBadge, ExplorerTxLink }
    │   └── layout/{ Header, Countdown }
    ├── hooks/
    │   ├── useWordleGame.ts     # CORE state machine (see below)
    │   ├── useMiniPay.ts        # detect + auto-connect + legacy-tx sender + gating
    │   ├── useSubmitResult.ts   # wagmi useWriteContract → submitResult(...) (legacy tx)
    │   ├── useGameStats.ts      # on-chain streaks/results + localStorage fallback
    │   ├── useCountdown.ts      # ticking time-to-next reset (from closesAt)
    │   ├── useTheme.ts          # dark/colorblind palette, persisted, sets data-* on <html>
    │   └── useLocalStorage.ts   # typed, per-day-namespaced persistence
    ├── lib/
    │   ├── api/{ client.ts, wordle.ts }   # the ONLY place that talks to the BE (gameApi)
    │   ├── game/{ evaluate.ts, keyboard.ts, hardMode.ts, share.ts, day.ts }
    │   └── chains.ts            # celo/alfajores objects + active-chain from env
    └── types/game.ts           # LetterState, TileState, GameStatus, GuessRow, Stats, Settings
```

**Key responsibilities**
- **`useWordleGame`** — single source of in-progress truth: board + keyboard map; optimistic
  2-pass `evaluate()` for instant flips, **reconciled against the BE's authoritative `marks`**;
  per-day localStorage persist/rehydrate; hard-mode enforcement; daily-reset detection. UI stays
  presentational.
- **`lib/api/wordle.ts`** — the only BE caller: `getDailyMeta()`, `validateGuess(guess)` →
  `{ marks, … }` (authoritative), `getAttestation()` → `{ tx.args, signature }`.
- **`useMiniPay` + `useSubmitResult`** — the only wallet-side writers; both force `type: "legacy"`
  and use the abi/address from `@wordlelo/contracts`.
- **`web3/Providers.tsx`** — `WagmiProvider` + React Query + Theme/Toast/Settings contexts.

---

## 7. Build roadmap (phased)

> Each phase ships as its own PR (branch → PR → merge). Include "Celo" in commits.

- **P0 — Scaffold (½ day).** Add `fe/` to `pnpm-workspace.yaml`; Next.js App Router + Tailwind +
  Biome; depend on `@wordlelo/contracts`. A blank page renders + `pnpm fe:dev` works.
- **P1 — Core game, fully mocked (2–3 days).** Board, keyboard (on-screen + physical), typing,
  optimistic 2-pass `evaluate`, flip/shake/bounce, keyboard coloring, toasts, hard mode, per-day
  localStorage, stats modal, share, dark/colorblind themes. `gameApi` is **mocked** (hardcoded dev
  word, local scoring). **No web3 yet** — this is already a fully playable Wordle.
- **P2 — Web3 wiring (1–2 days).** `Providers` (wagmi + celo chain), `useMiniPay`
  detection/auto-connect, `NetworkBadge`, non-MiniPay connect button, SIWE login (`personal_sign`)
  against the mock auth, read on-chain `streaks`/`results` into the stats modal.
- **P3 — Result submission (1 day).** On game end → `getAttestation()` → `useSubmitResult` with
  `type:"legacy"` → `ExplorerTxLink` to Celoscan. Gate the real on-chain submit behind `USE_REAL_BE`
  (a mock sig reverts). Wire a real settler on **Alfajores** first when the BE provides one.
- **P4 — PWA + MiniPay listing + polish (1 day).** `manifest.json`, `/icon-512.png`, `/terms`,
  `/privacy`, `next-pwa` service worker; finalize colorblind/reduced-motion/a11y; test inside
  MiniPay (`?minipay=1`).
- **Integration.** When the real BE lands: flip `USE_REAL_BE`, set `NEXT_PUBLIC_BE_URL`. Done.

---

## 8. Getting started

```bash
# 1. add "fe" to pnpm-workspace.yaml (be, fe, packages/*)
# 2. scaffold Next.js into fe/ (App Router, TS, Tailwind), then:
#    - rename the package to @wordlelo/fe, set "private": true
#    - add dep:  "@wordlelo/contracts": "workspace:*"
#    - reuse root Biome (no separate ESLint/Prettier)
pnpm install
pnpm fe:dev            # after adding the root fe:dev script
```

Confirm the contracts package resolves:
```ts
import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@wordlelo/contracts";
console.log(WORDLE_GAME_ADDRESS); // 0x1b444313a61be61830d4983dCe350A018C288600
```

---

## 9. Critical gotchas checklist

- [ ] **`type: "legacy"` on every wallet-side write** (`submitResult`). MiniPay ignores EIP-1559.
- [ ] **Never embed the word / never score in production.** BE is authoritative; local 2-pass is a
      dev mock + optimistic-flip only, always reconciled to the BE's `marks`.
- [ ] **No `signTypedData` / EIP-712 anywhere.** Use `personal_sign` (SIWE). MiniPay hangs on EIP-712.
- [ ] **No "Connect Wallet" button inside MiniPay** — auto-connect on detect.
- [ ] **Gate UI on `isConnected || isAuthenticated`**, never `isConnected` alone.
- [ ] **Import ABI + address from `@wordlelo/contracts`** — never copy-paste an ABI.
- [ ] **`day` comes from the server** for the on-chain key; drive the countdown off `closesAt`.
- [ ] **Don't tight-poll Forno** (rate-limited) — debounce reads.
- [ ] **Respect `prefers-reduced-motion`.**
- [ ] **PWA from root:** `/icon-512.png`, `/manifest.json`, `/terms`, `/privacy` for the MiniPay listing.

---

*This plan was generated from a multi-agent audit of the live contract, the backend design, and the
target UX. Live contract: `0x1b444313a61be61830d4983dCe350A018C288600` (Celo mainnet 42220), verified
on Celoscan. Questions on the contract surface or attestation flow → ask the SC/BE owner.*
