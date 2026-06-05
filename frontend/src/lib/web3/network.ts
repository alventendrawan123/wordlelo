import { celo, celoAlfajores } from "wagmi/chains";

export function isSupportedChain(chainId: number | undefined): boolean {
  return chainId === celo.id || chainId === celoAlfajores.id;
}

export function chainName(chainId: number | undefined): string {
  if (chainId === celo.id) {
    return "Celo";
  }
  if (chainId === celoAlfajores.id) {
    return "Alfajores";
  }
  return "Wrong network";
}

function explorerBase(chainId: number | undefined): string {
  if (chainId === celoAlfajores.id) {
    return "https://alfajores.celoscan.io";
  }
  return "https://celoscan.io";
}

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string,
): string {
  return `${explorerBase(chainId)}/tx/${hash}`;
}

export function explorerAddressUrl(
  chainId: number | undefined,
  address: string,
): string {
  return `${explorerBase(chainId)}/address/${address}`;
}
