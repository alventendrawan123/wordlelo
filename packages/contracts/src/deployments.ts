/**
 * WordleGame deployments on Celo, keyed by chain id.
 * `proxy` is the address to interact with (UUPS — the implementation can change,
 * the proxy address is stable).
 */
export const deployments = {
  /** Celo mainnet */
  42220: {
    name: "celo",
    chainId: 42220,
    proxy: "0x1b444313a61be61830d4983dCe350A018C288600",
    implementation: "0x31F26f77F73dBB7ac9A03415D73d46AE81CF8af1",
    admin: "0x8143C0B1442820bDf2e0EFc71785c4497CaDF751",
    deployBlock: 68686564,
    deployTx: "0x7cc284eb7539db8e25a129e7da136fdaa47c6713a329330919eff6edbd1df98b",
    explorer: "https://celoscan.io/address/0x1b444313a61be61830d4983dCe350A018C288600",
  },
} as const;

export type WordleChainId = keyof typeof deployments;
