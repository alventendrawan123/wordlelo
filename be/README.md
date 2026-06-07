# Wordlelo Backend API (for the frontend)

The backend is the **authority** for the daily word, guess scoring, and the SETTLER
attestation that lets a player settle their result on the Celo `WordleGame`. The
frontend never holds the answer.

- **Base URL:** `${NEXT_PUBLIC_BE_URL}` (e.g. `http://localhost:3001` in dev)
- **All routes under** `/api/v1`
- **Content-Type:** `application/json`
- **Auth:** none for the MVP (SIWE may be added later)
- **Marks vocabulary:** `"correct" | "present" | "absent"`
- **Errors** (any non-2xx): `{ "error": { "code": "STRING_CODE", "message": "..." } }`
  Codes: `INVALID_GUESS` (400), `NOT_IN_WORD_LIST` (422), `BAD_REQUEST` (400), `INTERNAL` (5xx).
- **`day`** is an integer = `floor((Date.now() - Date.UTC(2025,0,1)) / 86_400_000)`. Read it
  from the server; it's the same integer used as the on-chain `day` key.

---

## GET `/api/v1/puzzle/today`

Daily puzzle metadata. Never returns the word.

```json
{
  "day": 521,
  "wordLength": 5,
  "maxGuesses": 6,
  "hardModeAllowed": true,
  "opensAt": "2026-06-06T00:00:00.000Z",
  "closesAt": "2026-06-07T00:00:00.000Z",
  "commitment": "0x9f…"   // on-chain wordCommit[day] = keccak256(word, salt)
}
```

## POST `/api/v1/puzzle/today/guess`

Authoritative scoring of a single guess.

**Request**
```json
{ "guess": "STOCK", "hardMode": false }
```

**Response 200**
```json
{
  "day": 521,
  "guess": "STOCK",
  "marks": ["correct","absent","present","absent","absent"],
  "guessesUsed": 0,
  "remaining": 6,
  "completed": false,
  "won": true
}
```
- Use **`marks`** + **`won`**. `guessesUsed`/`remaining`/`completed` are placeholders for now
  (the server is stateless; the client owns the board/turn count).
- **Errors:** `400 INVALID_GUESS` (not 5 letters), `422 NOT_IN_WORD_LIST` (not a dictionary word).

## POST `/api/v1/puzzle/today/attestation`  ⚠️ request shape changed

Call this when the game is over (won, or lost after 6 guesses). The server **re-scores the
whole sequence** against the secret word (so a forged win can't pass), then the SETTLER signs
the result for the contract.

> **FE change needed:** the current `realGetAttestation` sends an empty body. It must now send
> the player's wallet address + the full guess list:

**Request**
```json
{
  "player": "0x8143C0B1442820bDf2e0EFc71785c4497CaDF751",
  "guesses": ["CRANE", "SLOTH", "STOCK"],
  "hardMode": false
}
```

**Response 200**
```json
{
  "attestation": {
    "player": "0x8143…",
    "day": 521,
    "guesses": 3,
    "won": true,
    "hardMode": false,
    "contract": "0x1b444313a61be61830d4983dCe350A018C288600",
    "chainId": 42220,
    "signature": "0x…65-byte-ecdsa"
  },
  "tx": { "functionName": "submitResult", "args": [521, 3, true, false, "0x…signature"] }
}
```
- Pass **`tx.args`** straight into a viem `writeContract` for `submitResult`, sent as
  **`type: "legacy"`** (MiniPay). The FE never builds the digest — it just relays `args`.
- **Errors:** `400 BAD_REQUEST` (missing/invalid player, or game not complete),
  `422 NOT_IN_WORD_LIST` (a guess isn't a dictionary word), `503` (signer not configured server-side).

## GET `/api/v1/leaderboard`

Aggregate leaderboard (most wins, then most played), built from on-chain settles. Optional `?limit=` (default 50, max 100).

```json
{
  "leaderboard": [
    { "player": "0x8143…", "played": 12, "wins": 9 },
    { "player": "0x1aa2…", "played": 7, "wins": 5 }
  ]
}
```

## GET `/api/v1/me/results?player=0x…`

A single player's settled-result history (newest day first). Requires a valid `?player=` address (else `400 BAD_REQUEST`).

```json
{
  "results": [
    { "player": "0x8143…", "day": 521, "guesses": 3, "won": true, "hardMode": false, "txHash": "0x…", "blockNumber": 68690123, "settledAt": "2026-06-06T12:00:00.000Z" }
  ]
}
```
- These two are **DB-backed** (Supabase Postgres). They return `503` if the server has no `DATABASE_URL`.
- The data is populated by the **indexer**, which reads the contract's `ResultSubmitted` events into Postgres. Run it as a worker:
  ```bash
  pnpm --filter @wordlelo/be indexer        # catch up + poll
  pnpm --filter @wordlelo/be indexer:once   # backfill once and exit
  ```

## GET `/health`
```json
{ "status": "ok", "service": "wordlelo-be", "chain": "celo" }
```

---

## End-to-end flow

1. `GET /puzzle/today` → show the board + the `commitment` ("provably fair").
2. Each guess → `POST /guess` → render `marks` (reconcile your optimistic render against it).
3. On game over → `POST /attestation` with `{ player, guesses, hardMode }`.
4. `writeContract(submitResult, tx.args, { type: "legacy" })` from the player's wallet.

## Run locally

```bash
pnpm install
pnpm --filter "@wordlelo/be..." build          # builds @wordlelo/core + contracts deps first
SERVER_SECRET=dev-secret \
SETTLER_PRIVATE_KEY=0x<key-with-SETTLER_ROLE> \
CORS_ORIGIN=http://localhost:3000 \
pnpm --filter @wordlelo/be dev                 # http://localhost:3001
```
`SETTLER_PRIVATE_KEY` is only needed for the attestation route; `/puzzle/today` and `/guess`
work without it.
