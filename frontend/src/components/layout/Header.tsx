import Link from "next/link";
import { NetworkBadge } from "@/components/web3/NetworkBadge";
import { WalletButton } from "@/components/web3/WalletButton";

export interface HeaderProps {
  onOpenHelp: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded text-lg text-foreground/70 hover:text-foreground";

export function Header({
  onOpenHelp,
  onOpenStats,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-tile-border px-3 py-3">
      <div className="flex flex-1 items-center gap-2">
        <WalletButton />
        <NetworkBadge />
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-[0.2em] sm:text-3xl sm:tracking-[0.3em]">
        Wordlelo
      </h1>
      <div className="flex flex-1 items-center justify-end gap-1">
        <Link
          href="/leaderboard"
          aria-label="Leaderboard"
          className={ICON_BUTTON}
        >
          🏆
        </Link>
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="How to play"
          className={ICON_BUTTON}
        >
          ?
        </button>
        <button
          type="button"
          onClick={onOpenStats}
          aria-label="Statistics"
          className={ICON_BUTTON}
        >
          📊
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className={ICON_BUTTON}
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
