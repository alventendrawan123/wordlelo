import { Modal } from "@/components/modals/Modal";
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
}

export function StatsModal({
  open,
  onClose,
  stats,
  highlightRow = null,
}: StatsModalProps) {
  const winPct =
    stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);

  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      <div className="mb-6 grid grid-cols-4 gap-2">
        <StatCell label="Played" value={stats.played} />
        <StatCell label="Win %" value={winPct} />
        <StatCell label="Streak" value={stats.currentStreak} />
        <StatCell label="Max streak" value={stats.maxStreak} />
      </div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        Guess distribution
      </h3>
      <GuessDistribution
        distribution={stats.distribution}
        highlightRow={highlightRow}
      />
    </Modal>
  );
}
