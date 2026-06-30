# Wordlelo — Dune traction dashboard

On-chain traction for the Celo Proof of Ship review, built from the `WordleGame`
contract's settle events. **All numbers are verifiable on-chain — do not fake them.**

- **Contract (Celo mainnet, 42220):** `0x1b444313a61be61830d4983dCe350A018C288600`
- **Event:** `ResultSubmitted(address indexed player, uint256 indexed day, uint8 guesses, bool won, bool hardMode)`
- **topic0:** `0x67e7dc8a3a2dc92ef63457ebaea61278ecdebba4dce13e9e0facfcba55183468`

## Setup (once)

**Decode the contract** so the queries can use a clean table:
Dune → **Submit a contract** → address `0x1b444313a61be61830d4983dCe350A018C288600`,
chain **Celo**, namespace `wordlelo`, paste the ABI from
`packages/contracts/src/abi.ts`. This yields the table
**`celo.wordlelo_evt_ResultSubmitted`** with columns:
`player, day, guesses, won, hardMode, evt_block_time, evt_block_number, evt_tx_hash, evt_index`.

> **No decode? Use the raw-logs base instead.** Prefix any query below with this CTE
> and replace `celo.wordlelo_evt_ResultSubmitted` with `wordlelo`:
>
> ```sql
> WITH wordlelo AS (
>   SELECT
>     block_time                                                 AS evt_block_time,
>     tx_hash                                                    AS evt_tx_hash,
>     bytearray_substring(topic1, 13, 20)                        AS player,
>     bytearray_to_uint256(topic2)                               AS day,
>     bytearray_to_uint256(bytearray_substring(data,  1, 32))    AS guesses,
>     bytearray_to_uint256(bytearray_substring(data, 33, 32)) = 1 AS won,
>     bytearray_to_uint256(bytearray_substring(data, 65, 32)) = 1 AS "hardMode"
>   FROM celo.logs
>   WHERE contract_address = 0x1b444313a61be61830d4983dCe350A018C288600
>     AND topic0 = 0x67e7dc8a3a2dc92ef63457ebaea61278ecdebba4dce13e9e0facfcba55183468
> )
> ```

---

## Q1 — Headline counters (one query → six counters)

```sql
SELECT
  count(*)                                                              AS total_games,
  count(DISTINCT player)                                                AS unique_players,
  round(100.0 * count_if(won) / nullif(count(*), 0), 1)                 AS win_rate_pct,
  count(DISTINCT date_trunc('day', evt_block_time))                     AS active_days,
  count_if(evt_block_time > now() - interval '7' day)                   AS games_7d,
  count(DISTINCT if(evt_block_time > now() - interval '7' day, player)) AS players_7d
FROM celo.wordlelo_evt_ResultSubmitted
```

Viz: add **6 Counter** widgets on this one query, each pointing at a different column.

## Q2 — Daily active users + daily games

```sql
SELECT
  date_trunc('day', evt_block_time) AS day,
  count(DISTINCT player)            AS dau,
  count(*)                          AS games
FROM celo.wordlelo_evt_ResultSubmitted
GROUP BY 1
ORDER BY 1
```

Viz: **Bar chart**, x = `day`, y = `dau` and `games` (grouped).

## Q3 — Cumulative unique players (growth curve)

```sql
WITH firsts AS (
  SELECT player, min(evt_block_time) AS first_seen
  FROM celo.wordlelo_evt_ResultSubmitted
  GROUP BY 1
)
SELECT
  date_trunc('day', first_seen)                                AS day,
  count(*)                                                     AS new_players,
  sum(count(*)) OVER (ORDER BY date_trunc('day', first_seen))  AS cumulative_players
FROM firsts
GROUP BY 1
ORDER BY 1
```

Viz: **Area chart**, x = `day`, y = `cumulative_players`.

## Q4 — New vs returning players per day (retention)

```sql
WITH plays AS (
  SELECT player, date_trunc('day', evt_block_time) AS d
  FROM celo.wordlelo_evt_ResultSubmitted
),
firsts AS (
  SELECT player, min(d) AS first_day FROM plays GROUP BY 1
)
SELECT
  p.d                                                            AS day,
  count(DISTINCT if(p.d = f.first_day, p.player))               AS new_players,
  count(DISTINCT if(p.d > f.first_day, p.player))               AS returning_players
FROM plays p
JOIN firsts f ON p.player = f.player
GROUP BY 1
ORDER BY 1
```

Viz: **Bar chart (stacked)**, x = `day`, y = `new_players` + `returning_players`.

## Q5 — Games per player (engagement depth)

```sql
WITH per_player AS (
  SELECT player, count(*) AS games
  FROM celo.wordlelo_evt_ResultSubmitted
  GROUP BY 1
)
SELECT
  CASE
    WHEN games = 1            THEN '1 game'
    WHEN games BETWEEN 2 AND 4 THEN '2-4'
    WHEN games BETWEEN 5 AND 9 THEN '5-9'
    ELSE '10+'
  END                       AS bucket,
  min(games)                AS sort_key,
  count(*)                  AS players
FROM per_player
GROUP BY 1
ORDER BY 2
```

Viz: **Bar chart**, x = `bucket`, y = `players`.

## Q6 — Guess distribution on wins (shows real play)

```sql
SELECT
  guesses             AS guesses_to_win,
  count(*)            AS games
FROM celo.wordlelo_evt_ResultSubmitted
WHERE won
GROUP BY 1
ORDER BY 1
```

Viz: **Bar chart**, x = `guesses_to_win`, y = `games`.

## Q7 — Recent settled results (liveness proof)

```sql
SELECT
  evt_block_time      AS time,
  player,
  day,
  guesses,
  won,
  "hardMode"          AS hard_mode,
  evt_tx_hash         AS tx
FROM celo.wordlelo_evt_ResultSubmitted
ORDER BY evt_block_time DESC
LIMIT 25
```

Viz: **Table**.

---

## Dashboard layout

Title: **Wordlelo — Traction (Celo mainnet)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ TEXT: Daily word game on Celo. Links: game · contract · GitHub.       │
│       All metrics are on-chain ResultSubmitted events (verifiable).   │
├───────────┬───────────┬───────────┬───────────┬───────────┬──────────┤
│ Total     │ Unique    │ Win rate  │ Active    │ Games     │ Players  │  ← Q1
│ games     │ players   │ %         │ days      │ (7d)      │ (7d)     │   (6 counters)
├───────────┴───────────┴───────────┼───────────┴───────────┴──────────┤
│ DAU + daily games (bar)           │ Cumulative players (area)         │  ← Q2 | Q3
│                                   │                                   │
├───────────────────────────────────┼───────────────────────────────────┤
│ New vs returning / day (stacked)  │ Games per player (bar)            │  ← Q4 | Q5
│                                   │                                   │
├───────────────────────────────────┼───────────────────────────────────┤
│ Guess distribution on wins (bar)  │  (spare / KPI text)               │  ← Q6
├───────────────────────────────────┴───────────────────────────────────┤
│ Recent settled results (table, full width)                            │  ← Q7
└───────────────────────────────────────────────────────────────────────┘
```

Then **Share → public link** and send it to the ambassador alongside the game links.

## Links to send

```
🎮 Game:      https://wordlelo.vercel.app
📜 Contract:  https://celoscan.io/address/0x1b444313a61be61830d4983dCe350A018C288600
💻 GitHub:    https://github.com/alventendrawan123/wordlelo
📊 Dune:      <public dashboard link once published>
⛓️  Chain:     Celo mainnet (42220) — live on Celo
```
