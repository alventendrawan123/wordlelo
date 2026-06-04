# Project Rules — Wordlelo Frontend

These rules are mandatory for all contributors (humans and AI agents) working in this repository. The goal is to maintain code quality, architectural consistency, and production readiness.

---

## 0. Platform Overview — Wordlelo

**Wordlelo** is a faithful **Wordle** clone — a 5-letter word, 6 guesses, one daily puzzle — that settles every result **on Celo mainnet**. It is built for the Celo **Proof-of-Ship** program: each genuine player produces a real on-chain transaction, so the game's daily active users are honest, not bot-farmed. This repository (`frontend`, package-to-be `@wordlelo/fe`) is the **frontend layer** of the Wordlelo monorepo, built on Next.js App Router.

### Vision

Deliver a word game that is **indistinguishable from NYT Wordle** in moment-to-moment play, while being **provably fair** and **self-custodial** — the answer lives server-side (never shipped to the client), results are attested by the backend and submitted by the player's own wallet, and the day's word is committed on-chain up front and revealed only after the day closes.

### Positioning

- **Mobile-first mini-app** — MiniPay-first wallet UX (auto-connect, no "Connect Wallet" button inside MiniPay), installable as a PWA.
- **Backend-authoritative & provably fair** — the secret word + scoring live server-side; the contract stores a commit hash up front (commit–reveal). The FE never holds the answer and never scores in production.
- **Real on-chain DAU** — each completed game is the player's own `submitResult` transaction on Celo (Option B: the backend signs an attestation, the player relays it).
- **Faithful & accessible by default** — every screen ships with loading/empty/error states, dark mode, a colorblind palette, reduced-motion support, and a11y from the first iteration.

### Tech Stack

| Layer            | Tooling                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router) — game is a client island; static shell + PWA   |
| UI runtime       | React 19 + React Compiler                                               |
| Language         | TypeScript (strict mode)                                                 |
| Styling          | Tailwind CSS v4 + CSS variables (light / dark / colorblind palettes)     |
| Wallet / chain   | wagmi v2 + viem v2 — Celo `42220` (mainnet), Alfajores `44787` (QA)      |
| Wallet UX        | MiniPay-first (injected, auto-connect); WalletConnect/injected fallback  |
| Contracts        | `@wordlelo/contracts` (`workspace:*`) — ABI + address, never copy-pasted |
| PWA              | next-pwa (Workbox) — MiniPay-ready manifest                              |
| Linter/Formatter | Biome                                                                    |
| Package Manager  | pnpm workspaces (`pnpm@10.30.3`)                                         |
| Deployment       | Vercel                                                                   |

> The wallet/chain, contracts, and PWA rows are wired up in the build roadmap (see `docs/planFE.md` §7, phases P2–P4). The current scaffold targets the fully playable, mocked game (P0–P1).

### High-Level Architecture

The chain layer is **invisible during play** — it only surfaces when settling a finished game.

```
   ┌──────────────┐  guess           ┌───────────────┐
   │  Frontend    │ ───────────────▶ │   Backend     │  holds the SECRET word
   │  (this repo) │ ◀─────────────── │  (authority)  │  → returns green/yellow/gray marks[]
   │  Next.js     │  on completion   │               │
   │              │ ───────────────▶ │  attestation  │  → SETTLER signs an ECDSA proof
   │              │ ◀─────────────── │               │
   └──────┬───────┘  { signature }   └───────────────┘
          │ submitResult(day, guesses, won, hardMode, sig)  ← player's OWN wallet tx
          │ (MiniPay · type:"legacy")                        ← real on-chain DAU
          ▼
   ┌─────────────────────────────────┐
   │   WordleGame (Celo mainnet)     │  verifies the attestation, records result + streak
   └─────────────────────────────────┘
```

- **Live contract:** proxy `0x1b444313a61be61830d4983dCe350A018C288600` · Celo mainnet `42220` · verified on Celoscan. Always call the **proxy** (UUPS — the implementation can change, the proxy address is stable).
- **Backend isn't built yet:** all BE calls sit behind one `gameApi` module (mocked locally) and flip to the real BE via a `USE_REAL_BE` flag — keep request/response types identical so the swap is a base-URL change.

### Audience & UX Principle

- **Audience**: MiniPay / mobile players who expect NYT-Wordle-grade feel and instant feedback.
- **UX Principle**: faithful to Wordle — clear hierarchy, instant tile feedback, no crypto jargon in the play loop; the wallet only appears at settlement.
- **Brand Voice**: clean, playful, confident — never crypto-gimmicky.

### Non-Negotiables

1. **Backend-authoritative** — never embed the word or score in production; the local 2-pass `evaluate()` is a dev mock + optimistic flip only, always reconciled to the BE's `marks`.
2. **`type: "legacy"` on every wallet write** — MiniPay ignores EIP-1559; centralize this in one tx helper.
3. **`personal_sign` only, never EIP-712** — `signTypedData` hangs in MiniPay; the player never signs the result, only relays the backend attestation.
4. **ABI + address from `@wordlelo/contracts`** — never copy-paste an ABI; always read `day` from the server for the on-chain key.
5. **Type-safe by default** — no `any`/`as` escape hatches; validate all external and on-chain data with Zod (see §2 → Type Safety).
6. **Production-ready** — every PR passes the checklist in §8 (loading/empty/error states, a11y, responsive, reduced-motion).
7. **Clean architecture & no-comment policy** — separation of concerns (§3) and self-documenting code (§5) are enforced.

> The full technical spec — contract interface, BE API contract, MiniPay integration, game UX, and the phased roadmap — lives in `docs/planFE.md`. These rules govern *how* you build; that plan governs *what* you build.

---

## 1. Commit & Push Rules (Conventional Commits)

Every commit **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. Commit messages must start with one of the following prefixes:

| Prefix      | Purpose                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `feat:`     | A new user-facing feature                                              |
| `fix:`      | A bug fix                                                              |
| `docs:`     | Documentation changes (README, public comments, JSDoc, etc.)           |
| `style:`    | Formatting, whitespace, semicolons — no logic change                   |
| `refactor:` | Code restructuring without behavior change                             |
| `perf:`     | Performance improvements                                               |
| `test:`     | Adding or fixing tests                                                 |
| `build:`    | Build system, dependencies, or lockfile changes                        |
| `ci:`       | CI/CD configuration changes                                            |
| `chore:`    | Maintenance tasks that don't fit other categories                      |
| `revert:`   | Reverting a previous commit                                            |

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Rules

- **Subject** is written in English, lowercase, imperative mood, no trailing period, max 72 characters.
- **The subject must include "Celo".** Every commit message must contain the word `Celo` — place it at the end of the subject. As a proper noun it keeps its capital `C`, which does not break the lowercase rule. Example: `feat(game): add tile flip animation Celo`.
- **Scope** is optional; use it to mark the affected module/feature (e.g. `feat(game): add board reveal Celo`).
- **Body** is optional; explain the **why**, not the **what**.
- **Breaking changes** must be marked with `BREAKING CHANGE:` in the footer or `!` after the type (e.g. `feat!: drop legacy storage schema Celo`).
- **Forbidden**: generic messages such as `update`, `fix bug`, `wip`, `asdf`.

### Push Rules

- **Branch → PR → merge, always.** Never commit or push directly to `main`. Every change lands through a Pull Request that is reviewed and merged; each roadmap phase ships as its own PR (see `docs/planFE.md` §7).
- **Forbidden** to force-push to `main`.
- **Forbidden** to use `--no-verify` to skip hooks without maintainer approval.
- Use branch naming: `feat/<feature-name>`, `fix/<bug-name>`, `chore/<task>`.
- PRs must pass lint, type-check, and tests before merge.
- Squash-merge is the default for feature branches to keep `main` history clean.

### Secret Files — NEVER Push

- **Strictly forbidden** to commit or push files containing secrets, including but not limited to:
  - `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.*.local`
  - Private keys (`*.pem`, `*.key`, `id_rsa`, mnemonics, seed phrases)
  - Credentials files (`credentials.json`, `service-account.json`, `gcp-key.json`)
  - API tokens, OAuth secrets, GitHub tokens, database connection strings, signing keys
  - Wallet keystores, smart contract deployer keys, RPC URLs containing API keys
- All of the above **must** be listed in `.gitignore` before any work begins.
- Use `.env.example` (committed) to document the required variables — never commit real values.
- Stage files explicitly by name (`git add path/to/file`); **avoid** `git add .` or `git add -A`, which can sweep in untracked secret files by accident.
- Before pushing, run `git diff --cached` and verify no `.env*`, key, or credential file is included.
- If a secret is accidentally committed: **rotate the secret immediately** (it must be considered compromised), purge it from history (`git filter-repo` / BFG), and force-push only after maintainer approval.
- Tools (humans and AI agents) loading a secret from `.env*` to perform a task **must** consume it inline (e.g. shell variable, redacted output) and never echo, log, or write it to any tracked file.

---

## 2. Clean Code Rules

All code **must** be clean, maintainable, and readable.

### Naming

- Use **descriptive** and **self-explanatory** names — avoid ambiguous abbreviations (`usr`, `tmp`, `data2`).
- `camelCase` for variables and functions, `PascalCase` for components and types, `SCREAMING_SNAKE_CASE` for global constants.
- Booleans start with `is`, `has`, `should`, `can` (e.g. `isLoading`, `hasError`).
- Component files: `PascalCase.tsx`. Util/hook files: `camelCase.ts` or `kebab-case.ts` per module convention.

### Functions

- One function = one responsibility (Single Responsibility).
- Max 30 lines per function. Beyond that, it **must** be split.
- Max 3 parameters. Beyond that, use an object parameter.
- Avoid nested ternaries and deep nesting (>3 levels) — prefer early returns / guard clauses.

### Readability

- **No comments in code** (see §5).
- Code must be self-documenting through clear naming.
- Avoid magic numbers / magic strings — extract them into named constants.
- Stay consistent with the existing codebase style. Respect the Biome config.

### Maintainability

- DRY (Don't Repeat Yourself), but don't over-abstract. Three occurrences is the refactor threshold.
- KISS (Keep It Simple, Stupid). The simplest solution that solves the problem always wins.
- YAGNI (You Aren't Gonna Need It). Don't write code for hypothetical needs.
- Write tests for non-trivial logic (unit tests for utils like `evaluate`, integration tests for important flows).

### Type Safety (TypeScript)

When facing a type error, **fix the type — never silence the checker.** These rules are mandatory:

1. **No escape hatches.** `as any`, `as unknown as`, `@ts-ignore`, `@ts-nocheck`, and `@ts-expect-error` are **forbidden**. If you reach for one, you have not solved the problem.
2. **Define the shape.** When a value's shape is unclear or untyped, declare an explicit `interface` / `type` (or a Zod schema, see rule 5) instead of leaving it loose.
3. **Narrow at runtime.** Use type guards or narrowing (`typeof`, `instanceof`, `in`, discriminated unions, custom `value is T` predicates) for runtime checks — never assert a shape you haven't verified.
4. **Prefer `satisfies` over `as`.** To validate a value against a type while keeping its inferred type, use `value satisfies T`, not `value as T` — `as` suppresses excess/missing-property checks, `satisfies` enforces them.
5. **Validate external data with Zod.** Any data crossing a trust boundary — `fetch`/API JSON, `response.json()`, `localStorage`/`sessionStorage`, `postMessage`, env vars, wallet-provider responses, on-chain reads — **must** be parsed with Zod (`safeParse` + graceful fallback on read paths) before use. Derive the TS type with `z.infer` so the schema is the single source of truth.
6. **Explain your choice.** In the PR (or commit body), state which type/guard/schema you used and **why** — especially for non-obvious narrowing or a deliberately lenient schema.

> Wordlelo's trust boundaries are concrete: the BE responses in `src/lib/api/` (puzzle meta, guess `marks`, attestation), `localStorage` game state, and on-chain reads via `@wordlelo/contracts`. Define each as a Zod schema co-located with its caller (e.g. `src/lib/api/wordle.ts`, `src/types/game.ts`) and derive the TS type with `z.infer`. The `attestation` / `tx.args` returned by the BE flow straight into `writeContract` — validate their shape before relaying.

---

## 3. Architecture Rules (Clean Architecture)

The project architecture must be **clean**, **modular**, and follow Clean Architecture principles. Wordlelo is a single-game app, so it uses a flat, layer-based structure (not feature modules).

### Layering

```
src/
├── app/                  # Next.js App Router (layout, page, globals.css, route handlers)
├── components/
│   ├── game/             # GameScreen, Board, Row, Tile, Keyboard, Key
│   ├── modals/           # Modal, StatsModal, HelpModal, SettingsModal
│   ├── feedback/         # Toast, ToastProvider
│   ├── share/            # ShareButton (spoiler-free emoji grid)
│   ├── stats/            # GuessDistribution
│   ├── web3/             # Providers, wagmiConfig, ConnectButton, NetworkBadge, ExplorerTxLink
│   └── layout/           # Header, Countdown
├── hooks/                # useWordleGame, useMiniPay, useSubmitResult, useGameStats, useCountdown, useTheme, useLocalStorage
├── lib/
│   ├── api/              # client.ts, wordle.ts — the ONLY place that talks to the BE (gameApi)
│   ├── game/             # evaluate.ts, keyboard.ts, hardMode.ts, share.ts, day.ts (pure logic)
│   ├── web3/             # network.ts, minipay.ts
│   └── chains.ts         # celo/alfajores objects + active chain from env
└── types/                # game.ts (LetterState, TileState, GameStatus, GuessRow, Stats, Settings)
```

### Dependency Rule

- **Domain / business logic** (`lib/game`, `types`) must not depend on **UI** or **framework**.
- **UI layer** (`components`) may depend on logic via hooks, never the other way around.
- **Outer layers** (UI, infrastructure) depend on **inner layers** (pure logic), never the reverse.
- **Circular dependencies** between modules are forbidden.

### Separation of Concerns

- **Components** only handle presentation. Complex logic is lifted into hooks (`src/hooks`) — `useWordleGame` is the single source of in-progress truth (board + keyboard map + persistence + hard-mode enforcement). UI stays presentational.
- **`lib/api`** is the only place that talks to the BE: `getDailyMeta()`, `validateGuess()` → authoritative `marks`, `getAttestation()` → `{ tx.args, signature }`.
- **`lib/web3` + `useMiniPay` / `useSubmitResult`** are the only wallet-side writers; both force `type: "legacy"` and use the abi/address from `@wordlelo/contracts`.
- **`lib/game`** contains pure functions only (`evaluate`, `share`, `hardMode`, `day`) — no side effects.

### Modularity

- Keep each module's public surface intentional; **don't reach into another module's internals** — import what it exposes.
- The BE is reachable **only** through `lib/api` (the `gameApi` boundary), so swapping mock → real BE is a base-URL change.
- Shared code used across more than 2 areas is moved into `src/components`, `src/hooks`, or `src/lib`.

---

## 4. Clean Files Rules

- **Forbidden** to keep unused files (dead code, backup files, `*.old.tsx`).
- **Forbidden** to commit `console.log`, `debugger`, or commented-out code.
- **Forbidden** to commit credentials, API keys, or any secrets.
- `.env`, `.env.local`, etc. **must** be in `.gitignore`.
- Each file has **one** responsibility. If a file exceeds 300 lines, evaluate whether to split it.
- Import order: external libraries → internal aliases (`@/...`) → relative paths → styles.
- Remove unused imports (auto-fixed via Biome).

---

## 5. No Comment Rule

**No comments are allowed in source code.** Code must be self-explanatory through clear naming and structure.

### Exceptions (allowed)

- JSDoc / TSDoc on **public APIs** (exported functions/components consumed by other modules).
- Comments explaining the **WHY** behind a non-obvious workaround (browser bug, MiniPay quirk, hardware constraint, etc.). Include an issue/PR link when available.
- TODO/FIXME entries that **must** include an owner and a tracker link (`// TODO(@bima): [LINEAR-123] handle retry`).
- License headers required by legal obligation.

### Forbidden

- Comments explaining the **WHAT** — the code already does that.
- Comments referring to a task/PR/sprint (`// added for sprint 12`).
- Commented-out code — use version control for history.
- Decorative comments (`// ===== UTILS =====`).

---

## 6. Design Pattern: The Wordle Palette (green / yellow / gray)

Wordlelo's visual identity is the **iconic Wordle tile palette** — **green** (correct), **yellow** (present), **gray** (absent) — on a clean light/dark surface, with a **colorblind** (orange/blue) alternative. Colors are **semantic tokens driven by CSS variables**, never hex literals inside components.

### Evaluation tokens (the heart of the brand)

| Token             | Light     | Dark      | Meaning                              |
| ----------------- | --------- | --------- | ------------------------------------ |
| `--color-correct` | `#6AAA64` | `#538D4E` | letter in the right spot (green)     |
| `--color-present` | `#C9B458` | `#B59F3B` | letter in the word, wrong spot (yellow) |
| `--color-absent`  | `#787C7E` | `#3A3A3C` | letter not in the word (gray)        |

### Colorblind / high-contrast variant

| Token (colorblind) | Value     | Replaces        |
| ------------------ | --------- | --------------- |
| `--color-correct`  | `#F5793A` | green → orange  |
| `--color-present`  | `#85C0F9` | yellow → blue   |

### Surface & text tokens

| Token                        | Light     | Dark      |
| ---------------------------- | --------- | --------- |
| `--color-bg`                 | `#FFFFFF` | `#121213` |
| `--color-text`               | `#1A1A1B` | `#FFFFFF` |
| `--color-tile-border`        | `#D3D6DA` | `#3A3A3C` |
| `--color-tile-border-filled` | `#878A8C` | `#565758` |
| `--color-key`                | `#D3D6DA` | `#818384` |

### Usage Rules

- **Evaluated tiles and keyboard keys** use only the `correct` / `present` / `absent` tokens — never a raw hex.
- **Keyboard coloring never downgrades**: a key shows the best status its letter ever reached (green > yellow > gray).
- **Dark mode** defaults to system, is toggleable, and is persisted — with no flash on load.
- **Colorblind mode** swaps the evaluation tokens **globally** (tiles + keyboard + share emoji) at once — never re-color one surface in isolation.
- **Contrast** must meet WCAG AA (ratio ≥4.5:1 for body text); evaluated tiles use white glyphs on the colored fill.
- **Share grid** maps the same tokens to emoji (🟩🟨⬜ — or 🟧🟦⬜ in colorblind) and **never leaks letters**.

### Implementation

- Define tokens once as CSS variables (Tailwind v4 `@theme` / `globals.css`), with `[data-theme="dark"]` and `[data-colorblind="true"]` overrides.
- Consume via Tailwind classes / `var(--color-*)` — **no hardcoded hex values** in JSX.

---

## 7. UI/UX Rules: Minimalist & Clean

The design **must** be minimalist, clean, and production ready — and faithful to NYT Wordle in moment-to-moment play.

### Principles

- **Less is more.** Remove any element without a clear purpose.
- **Clear hierarchy** — users know where to look first.
- **Generous whitespace** — never crowd elements without reason.
- **Consistency** — the same component behaves and looks the same throughout the app.
- **Typography**: max 2 font families, max 5 font sizes per screen.
- **Iconography**: use a single icon set (Lucide / Heroicons) with consistent sizes.

### Layout

- Use a consistent grid / flexbox; the board is a **6×5** grid.
- Spacing follows a 4px scale (4, 8, 12, 16, 24, 32, 48, 64).
- Border radius is consistent — define `sm`, `md`, `lg`, `full` tokens.
- Soft shadows, never excessive. Max 3 elevation levels.

### Interaction

- **Feedback**: every user action must have feedback (loading, success, error).
- **Loading state**: skeleton > spinner. Avoid blocking the UI.
- **Empty state**: explain the situation and provide a CTA when relevant.
- **Error state**: clear, actionable, human messages (never raw stack traces).
- **Animation**: tile flip on reveal (~100ms stagger L→R), row shake on invalid word, bounce on win; subtle, 150–250ms, `ease-out`. **Respect `prefers-reduced-motion`** (collapse to instant). Lock input during reveal animations.

### Accessibility (a11y)

- Semantic HTML (`<button>` for actions, `<a>` for navigation).
- Every input has a `<label>`.
- Focus states **must** be visible.
- Keyboard navigable — every action reachable via Tab; the game also responds to a physical keyboard.
- ARIA on tiles (letter + evaluation) and a labeled grid; meaningful alt text for images, `alt=""` for decorative ones.
- ARIA only when semantic HTML isn't enough.

### Responsive

- **Mobile-first.** Design for the smallest screen first (MiniPay), then scale up.
- Breakpoints follow Tailwind defaults: `sm`, `md`, `lg`, `xl`, `2xl`.
- Touch targets are at least 44×44 px.

---

## 8. Production Ready Checklist

Before merging into `main`, all the following items **must** be satisfied:

- [ ] `pnpm lint` (Biome) — passes with no errors/warnings.
- [ ] `pnpm type-check` (or `tsc --noEmit`) — passes with no errors.
- [ ] `pnpm test` — all tests green.
- [ ] `pnpm build` — build succeeds with no warnings.
- [ ] No `console.log`, `debugger`, or unowned `TODO`s.
- [ ] No secrets / credentials committed.
- [ ] Environment variables documented in `.env.example` (`NEXT_PUBLIC_BE_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_WC_PROJECT_ID`).
- [ ] Loading, empty, and error states handled.
- [ ] Tested on mobile, tablet, and desktop (and inside MiniPay via `?minipay=1`).
- [ ] Performance check (Lighthouse / Web Vitals) — LCP <2.5s, CLS <0.1, INP <200ms.
- [ ] Accessibility check — keyboard navigable, contrast OK, screen reader OK, `prefers-reduced-motion` respected.
- [ ] Clear PR description: **what** & **why**, linked issue, screenshot/video for UI changes.

---

## 9. Enforcement

- These rules are enforced through: **Biome**, **TypeScript strict mode**, **commitlint**, **husky pre-commit**, and **CI pipeline**.
- Repeated violations → PR will be blocked.
- Rule updates must go through a PR to this file, with discussion in review.

> Rules exist to help, not to obstruct. If any rule blocks productivity without delivering value, propose a revision via PR.
