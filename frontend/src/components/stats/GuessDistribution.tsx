import { MAX_GUESSES } from "@/types/game";

export interface GuessDistributionProps {
  distribution: number[];
  highlightRow?: number | null;
}

export function GuessDistribution({
  distribution,
  highlightRow = null,
}: GuessDistributionProps) {
  const max = Math.max(1, ...distribution);
  const rows = Array.from({ length: MAX_GUESSES }, (_, index) => ({
    guesses: index + 1,
    count: distribution.at(index) ?? 0,
  }));

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.guesses} className="flex items-center gap-2 text-sm">
          <span className="w-3 tabular-nums text-foreground/70">
            {row.guesses}
          </span>
          <div className="flex-1">
            <div
              className={`flex min-w-[1.75rem] justify-end rounded-sm px-2 py-0.5 font-semibold text-tile-text ${
                highlightRow === row.guesses ? "bg-correct" : "bg-absent"
              }`}
              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
            >
              {row.count}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
