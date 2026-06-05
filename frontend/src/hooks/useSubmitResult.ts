"use client";

import { useCallback } from "react";
import { useWriteContract } from "wagmi";
import type { Attestation } from "@/lib/api/schemas";
import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@/lib/web3/contract";

function isHex(value: string): value is `0x${string}` {
  return value.startsWith("0x");
}

export function useSubmitResult() {
  const { writeContractAsync, isPending } = useWriteContract();

  const submit = useCallback(
    (attestation: Attestation["attestation"]): Promise<`0x${string}`> => {
      if (!isHex(attestation.signature)) {
        return Promise.reject(new Error("Invalid attestation signature"));
      }
      return writeContractAsync({
        address: WORDLE_GAME_ADDRESS,
        abi: wordleGameAbi,
        functionName: "submitResult",
        args: [
          BigInt(attestation.day),
          attestation.guesses,
          attestation.won,
          attestation.hardMode,
          attestation.signature,
        ],
        // MiniPay ignores EIP-1559 — every wallet-side write must be legacy.
        type: "legacy",
      });
    },
    [writeContractAsync],
  );

  return { submit, isPending };
}
