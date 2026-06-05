import { CELO_MAINNET, WORDLE_GAME_ADDRESS } from "@wordlelo/contracts";
import type { FastifyInstance } from "fastify";
import type { Hex } from "viem";
import { createSettlerSigner } from "../attestation/signer.js";
import { verifyCompletion } from "../attestation/verify.js";
import { dayIndex } from "../daily/index.js";
import { ApiError } from "../errors.js";

/** Settlement attestation route under /api/v1/puzzle. */
export async function attestationRoutes(app: FastifyInstance): Promise<void> {
  app.post("/today/attestation", async (req) => {
    const body = (req.body ?? {}) as {
      player?: unknown;
      guesses?: unknown;
      hardMode?: unknown;
    };

    const player = typeof body.player === "string" ? body.player : "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(player)) {
      throw new ApiError(400, "BAD_REQUEST", "a valid player address is required");
    }
    const guesses = Array.isArray(body.guesses) ? body.guesses.map((g) => String(g)) : [];
    const hardMode = body.hardMode === true;

    const day = dayIndex();
    const { won, guessesUsed } = verifyCompletion(day, guesses, hardMode);

    const pk = process.env.SETTLER_PRIVATE_KEY as Hex | undefined;
    if (!pk) {
      throw new ApiError(
        503,
        "INTERNAL",
        "attestation signer not configured (set SETTLER_PRIVATE_KEY)",
      );
    }
    const signer = createSettlerSigner(pk);
    const signature = await signer.sign({
      player: player as Hex,
      day,
      guesses: guessesUsed,
      won,
      hardMode,
    });

    return {
      attestation: {
        player,
        day,
        guesses: guessesUsed,
        won,
        hardMode,
        contract: WORDLE_GAME_ADDRESS,
        chainId: CELO_MAINNET,
        signature,
      },
      tx: {
        functionName: "submitResult",
        args: [day, guessesUsed, won, hardMode, signature],
      },
    };
  });
}
