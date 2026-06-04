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
    <header className="flex items-center justify-between border-b border-tile-border px-3 py-3">
      <button
        type="button"
        onClick={onOpenHelp}
        aria-label="How to play"
        className={ICON_BUTTON}
      >
        ?
      </button>
      <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
        Wordlelo
      </h1>
      <div className="flex items-center gap-1">
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
