"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardEntry, PlayerResult } from "@/lib/api/schemas";
import { explorerTxUrl } from "@/lib/web3/network";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

interface BodyProps {
  loading: boolean;
  error: boolean;
  leaderboard: LeaderboardEntry[];
  results: PlayerResult[];
  hasWallet: boolean;
}

function LeaderboardBody({
  loading,
  error,
  leaderboard,
  results,
  hasWallet,
}: BodyProps) {
  if (loading) {
    return <p className="text-foreground/60">Loading…</p>;
  }
  if (error) {
    return (
      <p className="font-medium text-present">
        Could not load the leaderboard.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {leaderboard.length === 0 ? (
        <p className="text-foreground/60">
          No results yet — be the first to settle a win on Celo.
        </p>
      ) : (
        <ol className="divide-y divide-tile-border">
          {leaderboard.map((entry, index) => (
            <li
              key={entry.player}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="flex items-center gap-3">
                <span className="w-5 tabular-nums text-foreground/60">
                  {index + 1}
                </span>
                <span className="font-mono">{truncate(entry.player)}</span>
              </span>
              <span className="tabular-nums">
                <span className="font-bold text-correct">{entry.wins}</span>{" "}
                wins · {entry.played} played
              </span>
            </li>
          ))}
        </ol>
      )}

      {hasWallet && results.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
            Your settled results
          </h2>
          <ul className="divide-y divide-tile-border">
            {results.map((result) => (
              <li
                key={`r-${result.day}`}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  Day {result.day} ·{" "}
                  {result.won ? `${result.guesses}/6` : "X/6"}
                  {result.hardMode ? "*" : ""}
                </span>
                <a
                  href={explorerTxUrl(42220, result.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-correct underline underline-offset-2"
                >
                  tx ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function LeaderboardPage() {
  const { address } = useAccount();
  const { leaderboard, results, loading, error } = useLeaderboard(address);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 bg-background px-4 py-8 text-foreground">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← Back to game
        </Link>
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          Leaderboard
        </h1>
        <span aria-hidden className="w-20" />
      </div>
      <LeaderboardBody
        loading={loading}
        error={error}
        leaderboard={leaderboard}
        results={results}
        hasWallet={Boolean(address)}
      />
    </main>
  );
}
