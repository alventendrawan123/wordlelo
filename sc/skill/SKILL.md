---
name: celo-smart-contracts
description: >
  Build, test, and deploy Solidity smart contracts on Celo with Foundry and
  OpenZeppelin UUPS. Use whenever working on contracts in this repo (the
  Wordlelo on-chain game) — covers Celo network config, the MiniPay/legacy-tx
  and gas gotchas, proxy/upgrade and access-control patterns, USDT integration,
  the Wordle commit–reveal + signed-attestation design, and the deploy/verify
  flow. Distilled from the Circlo build notes.
---

# Celo Smart Contracts — Build Skill

Hard-won knowledge from shipping **Circlo** on Celo Mainnet, distilled for the
**Wordlelo** contracts. Read the relevant section before writing or deploying.

## When to use

- Writing/editing any `.sol` in `sc/contracts/`
- Designing storage layout, roles, or upgrade paths
- Wiring backend → chain calls (the BE owns `WORD_SETTER`/`SETTLER` keys)
- Deploying or verifying on Alfajores / Mainnet
- Anything touching MiniPay wallet-side transactions

---

## 1. Network config

| | Mainnet | Alfajores (testnet) |
|---|---|---|
| Chain ID | `42220` | `44787` |
| RPC | `https://forno.celo.org` | `https://alfajores-forno.celo-testnet.org` |
| Explorer | Celoscan | Celoscan (Alfajores) / Blockscout fallback |

- **Block time ~5s**, soft finality ~10s (deeper for hard finality).
- **Forno rate-limits** parallel reads above ~50/sec. For bursty indexing, run
  your own node or use Tatum/Quicknode. For contract dev this is a non-issue.
- **Always ship + test on Alfajores first.** Redeploys there are free.

`foundry.toml` baseline:

```toml
[profile.default]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
remappings = [
  "@openzeppelin/=lib/openzeppelin-contracts/",
  "@openzeppelin-upgradeable/=lib/openzeppelin-contracts-upgradeable/",
]

[rpc_endpoints]
celo = "https://forno.celo.org"
alfajores = "https://alfajores-forno.celo-testnet.org"

[etherscan]
celo      = { key = "${CELOSCAN_API_KEY}", chain = 42220, url = "https://api.celoscan.io/api" }
alfajores = { key = "${CELOSCAN_API_KEY}", chain = 44787, url = "https://api-alfajores.celoscan.io/api" }
```

---

## 2. Gas & transactions — read this twice

- **Normal baseFee 5–30 gwei.** Read it cleanly via `getBlock().baseFeePerGas`.
- **Anomaly windows:** occasionally spikes to **200+ gwei for hours** (seen
  Jun 1–3, 2026). At a spike, one `writeContract` with `gas: 300_000` costs
  **~0.06 CELO**. **Fund deployer/settler wallets with ~10× the normal margin**
  or your backend settler runs dry mid-day.
- **MiniPay ignores EIP-1559.** Every **wallet-side** `writeContract` (the
  player's own tx, e.g. `submitResult`) MUST set `type: "legacy"`. This is a
  frontend concern (Bima) but the contract design forces it — keep player txs
  cheap and single-call. **Backend-driven** txs (settler hot wallet) can use
  EIP-1559 normally.
- **Fee currency:** default to **native CELO** for gas. `feeCurrency: USDT` is
  possible on Celo but rarely worth the signing complexity — any CELO balance
  just works.

---

## 3. Tokens / stablecoins (if rewards use USDT)

- **USDT (Tether) on Celo:** `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`
- **6 decimals — NOT 18.** Use `parseUnits(amount, 6)` everywhere. Mismatching
  this is the #1 stablecoin bug.
- Vanilla ERC20: standard `approve` → `transferFrom`. No transfer-on-transfer
  fees, no rebasing. Pair `balanceOf` with your game state for "your rewards" UIs.

---

## 4. Upgradeability (UUPS) & access control

OpenZeppelin **UUPS** worked cleanly for Circlo (CircleFactory, PredictionPool,
ResolutionModule). Pattern:

```solidity
import {UUPSUpgradeable} from "@openzeppelin-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin-upgradeable/access/AccessControlUpgradeable.sol";

bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

function _authorizeUpgrade(address newImpl)
    internal override onlyRole(UPGRADER_ROLE) {}
```

**Roles to wire from day 1:**
`DEFAULT_ADMIN_ROLE`, `UPGRADER_ROLE`, `PAUSER_ROLE`, plus business roles. For
Wordlelo: `WORD_SETTER_ROLE` (commits/reveals the daily word) and `SETTLER_ROLE`
(the BE key that signs result attestations).

**Don't UUPS everything.** A truly immutable, single-purpose primitive (no auth,
no business logic to evolve) should skip the proxy overhead — make it a plain
contract. Reserve UUPS for contracts whose logic will genuinely change.

After a UUPS upgrade the **proxy address stays put** — FE/indexers don't
redeploy. Just republish the updated ABI in the shared types package.

---

## 5. Wordlelo contract design (this project)

**Model:** backend-authoritative + **commit–reveal**. The secret word is never
written on-chain until the day closes; the chain stores only a *commitment hash*
and *results*. This keeps the puzzle fair AND verifiable (players can prove the
BE didn't swap the word mid-day).

### Storage surface (`WordleGame`, UUPS)

```solidity
struct Result { uint8 guesses; bool won; bool hardMode; uint40 at; }
struct Streak { uint32 current; uint32 max; uint256 lastDay; }

mapping(uint256 => bytes32) public wordCommit;   // day => keccak256(word, salt)
mapping(uint256 => string)  public revealedWord; // day => word (after close)
mapping(address => mapping(uint256 => Result)) public results;
mapping(address => Streak) public streaks;

event WordCommitted(uint256 indexed day, bytes32 commitment);
event ResultSubmitted(address indexed player, uint256 indexed day, uint8 guesses, bool won);
event WordRevealed(uint256 indexed day, string word);
```

### Commit / reveal (WORD_SETTER = backend)

```solidity
function commitWord(uint256 day, bytes32 commitment) external onlyRole(WORD_SETTER_ROLE) {
    require(wordCommit[day] == bytes32(0), "committed");
    wordCommit[day] = commitment;                      // keccak256(abi.encodePacked(word, salt))
    emit WordCommitted(day, commitment);
}

function revealWord(uint256 day, string calldata word, bytes32 salt) external onlyRole(WORD_SETTER_ROLE) {
    require(keccak256(abi.encodePacked(word, salt)) == wordCommit[day], "mismatch");
    revealedWord[day] = word;
    emit WordRevealed(day, word);
}
```

### Result submission — **Option B: player submits with BE attestation** (recommended)

Each genuine player sends their **own** tx → each is a real on-chain DAU. The BE
signs an attestation so players can't forge wins. Bind the signature to
`address(this)` + `block.chainid` to kill cross-contract / cross-chain replay.

```solidity
using ECDSA for bytes32;
bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

function submitResult(uint256 day, uint8 guesses, bool won, bool hardMode, bytes calldata sig) external {
    require(results[msg.sender][day].at == 0, "already submitted");
    bytes32 digest = keccak256(abi.encodePacked(
        msg.sender, day, guesses, won, hardMode, address(this), block.chainid
    )).toEthSignedMessageHash();
    require(hasRole(SETTLER_ROLE, digest.recover(sig)), "bad attestation");

    results[msg.sender][day] = Result(guesses, won, hardMode, uint40(block.timestamp));
    _bumpStreak(msg.sender, day, won);
    emit ResultSubmitted(msg.sender, day, guesses, won);
}
```

> **Option A (BE submits via SETTLER hot wallet)** is simpler but every tx comes
> from one address → DAU = 1. Only fall back to it if wallet-side signing UX is
> blocking the demo. Default to **B**.

> MiniPay note: the player's `submitResult` call is wallet-side → FE must send it
> as `type: "legacy"` (see §2).

---

## 6. Honest metrics (non-negotiable)

DAU for Proof of Ship must come from **real players making real txs** — that's
exactly what Option B above gives you. **Do not** manufacture activity with bot
fleets / sock-puppet wallets or settlement-spam: it's Sybil fraud, Talent.app's
scoring filters non-value-moving txs out anyway, and it puts the submission at
risk. Build the game so genuine play *is* the on-chain signal.

A permissionless `settlement()` liveness beacon (emits `Settlement(timestamp)`,
~27k gas) is fine **only** as an honest liveness/heartbeat signal for dashboards
— never as a DAU inflator.

---

## 7. Testing & tooling (Foundry)

- **`forge test`** — aim for **>95% coverage** (realistic on this scope).
  Cover: double commit, reveal mismatch, replayed/forged signature, double
  submit, streak break across skipped days, role gating, pause.
- **`forge fmt`** in CI; treat format drift as a CI error.
- Fuzz the scoring-independent invariants (one result per player per day; streak
  monotonicity).
- Use `vm.sign` with a test SETTLER key to exercise the attestation path.

---

## 8. Deploy & verify flow

1. `forge script` deploy **implementation + ERC1967 proxy** to **Alfajores**.
2. Grant roles: `DEFAULT_ADMIN` (multisig later), `UPGRADER`, `PAUSER`,
   `WORD_SETTER` + `SETTLER` (BE hot wallet, funded with ~10× gas margin).
3. `forge verify-contract` on Celoscan (verified contracts decode custom errors
   readably — worth it).
4. Publish ABI + proxy address to the shared types package for BE/FE.
5. Smoke test: commit → submit (signed) → reveal on Alfajores before Mainnet.

---

## Quick reference

| Thing | Value |
|---|---|
| Mainnet / testnet chain ID | `42220` / `44787` |
| Mainnet RPC | `https://forno.celo.org` |
| USDT (6 dec) | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |
| Wallet-side tx type (MiniPay) | `legacy` (required) |
| Gas funding margin | ~10× normal (spikes to 200+ gwei) |
| Upgrade pattern | OZ UUPS, `_authorizeUpgrade` on `UPGRADER_ROLE` |
| Day-1 roles | `DEFAULT_ADMIN`, `UPGRADER`, `PAUSER`, `WORD_SETTER`, `SETTLER` |
