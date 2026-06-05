import { CELO_MAINNET, WORDLE_GAME_ADDRESS } from "@wordlelo/contracts";
import { encodePacked, keccak256, recoverMessageAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, it } from "vitest";
import { ANSWERS, dayIndex, wordForDay } from "../daily/index.js";
import { buildServer } from "../server.js";

// Anvil/Hardhat default account #1 — test only.
const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const SETTLER = privateKeyToAccount(TEST_PK);
const PLAYER = "0x8143C0B1442820bDf2e0EFc71785c4497CaDF751";

beforeAll(() => {
  process.env.SETTLER_PRIVATE_KEY = TEST_PK;
});

describe("POST /api/v1/puzzle/today/attestation", () => {
  it("signs a genuine win, recoverable to the SETTLER over the contract digest", async () => {
    const app = buildServer();
    const day = dayIndex();
    const answer = wordForDay(day);
    const firstGuess = ANSWERS.find((w) => w !== answer) as string;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/attestation",
      payload: { player: PLAYER, guesses: [firstGuess, answer], hardMode: false },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.attestation.won).toBe(true);
    expect(body.attestation.guesses).toBe(2);
    expect(body.attestation.contract).toBe(WORDLE_GAME_ADDRESS);
    expect(body.attestation.chainId).toBe(CELO_MAINNET);
    expect(body.tx.functionName).toBe("submitResult");
    expect(body.tx.args).toEqual([day, 2, true, false, body.attestation.signature]);

    // The signature must recover to the SETTLER over the exact contract digest.
    const digest = keccak256(
      encodePacked(
        ["address", "uint256", "uint8", "bool", "bool", "address", "uint256"],
        [PLAYER, BigInt(day), 2, true, false, WORDLE_GAME_ADDRESS, BigInt(CELO_MAINNET)],
      ),
    );
    const recovered = await recoverMessageAddress({
      message: { raw: digest },
      signature: body.attestation.signature,
    });
    expect(recovered.toLowerCase()).toBe(SETTLER.address.toLowerCase());
    await app.close();
  });

  it("rejects an incomplete game (one non-winning guess) with 400", async () => {
    const app = buildServer();
    const wrong = ANSWERS.find((w) => w !== wordForDay(dayIndex())) as string;
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/attestation",
      payload: { player: PLAYER, guesses: [wrong], hardMode: false },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("rejects a non-dictionary guess with 422", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/attestation",
      payload: { player: PLAYER, guesses: ["ZZZZZ"], hardMode: false },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("rejects a missing player address with 400", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/attestation",
      payload: { guesses: ["crane"], hardMode: false },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
