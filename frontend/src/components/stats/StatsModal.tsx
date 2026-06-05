import { Countdown } from "@/components/layout/Countdown";
import { Modal } from "@/components/modals/Modal";
import { ShareButton } from "@/components/share/ShareButton";
import type { OnChainStreak } from "@/hooks/useOnChainStreak";
import type { ShareOptions } from "@/lib/game/share";
import type { Stats } from "@/types/game";
import { GuessDistribution } from "./GuessDistribution";

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-center text-xs text-foreground/60">{label}</span>
    </div>
  );
}

export interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: Stats;
  highlightRow?: number | null;
  shareOptions?: ShareOptions | null;
  closesAt?: string | null;
  onChainStreak?: OnChainStreak | null;
}

export function StatsModal({
  open,
  onClose,
  stats,
  highlightRow = null,
  shareOptions = null,
  closesAt = null,
  onChainStreak = null,
}: StatsModalProps) {
  const winPct =
    stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
  const currentStreak = onChainStreak
    ? onChainStreak.current
    : stats.currentStreak;
  const maxStreak = onChainStreak ? onChainStreak.max : stats.maxStreak;

  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      <div className="grid grid-cols-4 gap-2">
        <StatCell label="Played" value={stats.played} />
        <StatCell label="Win %" value={winPct} />
        <StatCell label="Streak" value={currentStreak} />
        <StatCell label="Max streak" value={maxStreak} />
      </div>
      {onChainStreak ? (
        <p className="mt-2 text-center text-xs font-medium text-correct">
          Streaks synced from Celo
        </p>
      ) : null}
      <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        Guess distribution
      </h3>
      <GuessDistribution
        distribution={stats.distribution}
        highlightRow={highlightRow}
      />
      {shareOptions ? (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-tile-border pt-4">
          <Countdown closesAt={closesAt} />
          <ShareButton options={shareOptions} />
        </div>
      ) : null}
    </Modal>
  );
}
