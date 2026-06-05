import { CELO_MAINNET, WORDLE_GAME_ADDRESS } from "@wordlelo/contracts";
import { type Hex, encodePacked, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface AttestationInput {
  player: Hex;
  day: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
}

export interface SettlerSigner {
  address: Hex;
  sign(input: AttestationInput): Promise<Hex>;
}

/**
 * Build a SETTLER signer from a private key. It produces the exact EIP-191
 * signature the on-chain `WordleGame.submitResult` verifies:
 *
 *   sign( ethSignedMessage( keccak256(abi.encodePacked(
 *     player, day, guesses, won, hardMode, address(this), block.chainid)) ) )
 *
 * The recovered address must hold SETTLER_ROLE on the contract. The signer only
 * signs — it never sends a transaction, so its key does NOT need to be funded.
 */
export function createSettlerSigner(privateKey: Hex): SettlerSigner {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    sign(input: AttestationInput): Promise<Hex> {
      const digest = keccak256(
        encodePacked(
          ["address", "uint256", "uint8", "bool", "bool", "address", "uint256"],
          [
            input.player,
            BigInt(input.day),
            input.guesses,
            input.won,
            input.hardMode,
            WORDLE_GAME_ADDRESS,
            BigInt(CELO_MAINNET),
          ],
        ),
      );
      return account.signMessage({ message: { raw: digest } });
    },
  };
}
