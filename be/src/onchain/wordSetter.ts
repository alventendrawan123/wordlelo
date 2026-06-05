import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@wordlelo/contracts";
import { http, type Hex, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { commitmentForDay, saltForDay, wordForDay } from "../daily/index.js";

/** Commit call data for a day (pure — for dry-runs / display / tests). */
export function commitArgsFor(day: number, serverSecret: string): { day: number; commitment: Hex } {
  return { day, commitment: commitmentForDay(day, serverSecret) };
}

/** Reveal call data for a day (pure). */
export function revealArgsFor(
  day: number,
  serverSecret: string,
): { day: number; word: string; salt: Hex } {
  return { day, word: wordForDay(day), salt: saltForDay(day, serverSecret) };
}

/**
 * A WORD_SETTER client that commits / reveals the daily word on the Celo
 * `WordleGame`. The key must hold `WORD_SETTER_ROLE` on the contract and be
 * funded for gas. Backend-driven txs may use EIP-1559 (legacy is only required
 * for MiniPay wallet-side txs).
 */
export function createWordSetter(privateKey: Hex, serverSecret: string, rpcUrl?: string) {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({
    account,
    chain: celo,
    transport: http(rpcUrl ?? "https://forno.celo.org"),
  });

  return {
    address: account.address,

    /** Commit the day's word hash (call before the day opens). */
    commit(day: number): Promise<Hex> {
      const { commitment } = commitArgsFor(day, serverSecret);
      return wallet.writeContract({
        address: WORDLE_GAME_ADDRESS,
        abi: wordleGameAbi,
        functionName: "commitWord",
        args: [BigInt(day), commitment],
        account,
        chain: celo,
      });
    },

    /** Reveal the day's word + salt (call after the day closes). */
    reveal(day: number): Promise<Hex> {
      const { word, salt } = revealArgsFor(day, serverSecret);
      return wallet.writeContract({
        address: WORDLE_GAME_ADDRESS,
        abi: wordleGameAbi,
        functionName: "revealWord",
        args: [BigInt(day), word, salt],
        account,
        chain: celo,
      });
    },
  };
}
