import { explorerTxUrl } from "@/lib/web3/network";

export interface ExplorerTxLinkProps {
  chainId: number | undefined;
  hash: string;
}

export function ExplorerTxLink({ chainId, hash }: ExplorerTxLinkProps) {
  return (
    <a
      href={explorerTxUrl(chainId, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-correct underline underline-offset-2"
    >
      View transaction on Celoscan ↗
    </a>
  );
}
