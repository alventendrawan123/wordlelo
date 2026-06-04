"use client";

import type { SubmittedRow } from "@/hooks/useWordleGame";
import { useWordleGame } from "@/hooks/useWordleGame";
import { Board } from "./Board";
import { Keyboard } from "./Keyboard";

interface BoardAreaProps {
  loading: boolean;
  error: boolean;
  rows: SubmittedRow[];
  current: string;
  shakeRowIndex: number | null;
}

function BoardArea({
  loading,
  error,
  rows,
  current,
  shakeRowIndex,
}: BoardAreaProps) {
  if (loading) {
    return (
      <p className="flex flex-1 items-center text-foreground/60">Loading…</p>
    );
  }
  if (error) {
    return (
      <p className="flex flex-1 items-center text-foreground/60">
        Could not load the puzzle.
      </p>
    );
  }
  return (
    <div className="flex flex-1 items-center">
      <Board rows={rows} current={current} shakeRowIndex={shakeRowIndex} />
    </div>
  );
}

export function GameScreen() {
  const game = useWordleGame();

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-tile-border px-4 py-3">
        <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
          Wordlelo
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-between gap-4 px-4 py-4">
        <div
          className="flex h-7 items-center justify-center"
          aria-live="polite"
          aria-atomic="true"
        >
          {game.message ? (
            <span
              key={game.message.id}
              className="rounded bg-foreground px-3 py-1 text-sm font-semibold text-background"
            >
              {game.message.text}
            </span>
          ) : null}
        </div>

        <BoardArea
          loading={game.loading}
          error={game.error}
          rows={game.rows}
          current={game.current}
          shakeRowIndex={game.shakeRowIndex}
        />

        <Keyboard keyStates={game.keyStates} onKey={game.handleKey} />
      </main>
    </div>
  );
}
