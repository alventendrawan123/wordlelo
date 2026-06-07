# 🚀 Update Terbaru — Backend LIVE (buat Bima)

Hai Bima! Backend + Smart Contract udah **100% selesai & deployed**. Tinggal kamu sambungin FE-nya. Ini ringkasannya. 🙌

---

## TL;DR — yang perlu kamu lakuin

1. Set 2 env di FE
2. Ubah `getAttestation` biar kirim body `{ player, guesses, hardMode }`
3. (Bonus) ada endpoint **leaderboard** + **history** kalau mau bikin halaman ranking

Selesai segitu — FE langsung konek ke BE asli.

---

## 1. Set environment FE

```env
NEXT_PUBLIC_BE_URL=https://wordlelobe-production.up.railway.app
NEXT_PUBLIC_USE_REAL_BE=true
```

> CORS sekarang di-set `*` (bebas), jadi kamu bisa konek dari `localhost` maupun FE yang udah deploy. Nanti kalau FE-mu udah live, kabarin URL-nya — kita pin CORS ke situ biar lebih aman.

---

## 2. ⚠️ `getAttestation` — sekarang HARUS kirim body

Dulu `realGetAttestation` ngirim body kosong. Sekarang BE butuh **alamat wallet player + daftar tebakan** biar bisa re-score (anti-cheat) lalu tanda tangan.

**Request** ke `POST /api/v1/puzzle/today/attestation`:
```json
{
  "player": "0x8143C0B1442820bDf2e0EFc71785c4497CaDF751",
  "guesses": ["CRANE", "SLOTH", "STOCK"],
  "hardMode": false
}
```

**Response 200**:
```json
{
  "attestation": {
    "player": "0x8143…",
    "day": 522,
    "guesses": 3,
    "won": true,
    "hardMode": false,
    "contract": "0x1b444313a61be61830d4983dCe350A018C288600",
    "chainId": 42220,
    "signature": "0x…(65-byte ECDSA)"
  },
  "tx": { "functionName": "submitResult", "args": [522, 3, true, false, "0x…signature"] }
}
```

**Cara pakai:** ambil `tx.args`, lempar langsung ke viem `writeContract` buat `submitResult`, kirim sebagai **`type: "legacy"`** (MiniPay). FE nggak perlu bikin digest/hash — tinggal relay `args`.

```ts
await writeContract({
  address: WORDLE_GAME_ADDRESS,
  abi: wordleGameAbi,
  functionName: "submitResult",
  args: tx.args,           // [day, guesses, won, hardMode, signature]
  type: "legacy",          // MiniPay
});
```

**Error yang mungkin:** `400` (player invalid / guesses bukan 1–6), `422` (tebakan bukan kata di kamus), `503` (signer belum diset — harusnya nggak kejadian, udah dikonfig).

---

## 3. Endpoint baru — Leaderboard & History (opsional, buat halaman ranking 🏆)

### `GET /api/v1/leaderboard`
Ranking pemain (paling banyak menang). Optional `?limit=` (default 50, max 100).
```json
{ "leaderboard": [ { "player": "0x8143…", "played": 12, "wins": 9 } ] }
```

### `GET /api/v1/me/results?player=0x…`
Riwayat hasil 1 pemain (hari terbaru duluan).
```json
{ "results": [ { "player":"0x…", "day":522, "guesses":3, "won":true, "hardMode":false, "txHash":"0x…", "blockNumber":68690123, "settledAt":"2026-06-07T12:00:00.000Z" } ] }
```

> Data ini di-isi **otomatis** oleh indexer dari event on-chain `ResultSubmitted`. Sekarang masih kosong (`[]`) karena belum ada yang submit — begitu ada yang main + submit, langsung keisi. Jadi nggak perlu kamu apa-apain, tinggal `fetch` aja.

---

## API lengkap

Semua endpoint + shape request/response detail ada di **[be/README.md](../be/README.md)**:

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/v1/puzzle/today` | meta puzzle hari ini + commitment |
| POST | `/api/v1/puzzle/today/guess` | scoring 1 tebakan → `{ marks, won }` |
| POST | `/api/v1/puzzle/today/attestation` | tanda tangan hasil buat submit on-chain |
| GET | `/api/v1/leaderboard` | ranking |
| GET | `/api/v1/me/results?player=` | riwayat pemain |
| GET | `/health` | health check |

Marks: `"correct" | "present" | "absent"`. Error shape: `{ "error": { "code", "message" } }`.

---

## Alur main (end-to-end)

1. `GET /puzzle/today` → tampilin board + `commitment` (buat badge "provably fair")
2. Tiap tebakan → `POST /guess` → render `marks` (rekonsiliasi sama tebakan optimistic-mu)
3. Game over (menang / kalah setelah 6) → `POST /attestation` kirim `{ player, guesses, hardMode }`
4. `writeContract(submitResult, tx.args, { type: "legacy" })` dari wallet player
5. Indexer auto-catat → leaderboard ke-update 🎉

---

## Catatan penting

- **Smart Contract LIVE di Celo mainnet** (chain `42220`): `WORDLE_GAME_ADDRESS` = `0x1b444313a61be61830d4983dCe350A018C288600`. Import dari `@wordlelo/contracts` (`wordleGameAbi`, `WORDLE_GAME_ADDRESS`) — udah ada di repo.
- **Hari ini (day 522) udah di-commit on-chain** → game bisa langsung dimainkan & di-submit hari ini.
- **MiniPay**: pakai `type: "legacy"` buat semua tx wallet-side.
- Day index pakai epoch `Date.UTC(2025,0,1)` — sama persis kayak BE, jadi `day` on-chain udah sinkron sama yang FE hitung.

## Yang masih dikerjain di sisi BE (nggak ngeblokir kamu)
- Cron commit kata harian otomatis (hari ini udah manual, besok-besok di-otomatisin).

---

Ada yang kurang jelas / butuh contoh response tambahan? Bilang aja. Gas FE-nya Bim! 🔥
