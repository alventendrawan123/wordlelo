"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/feedback/ToastProvider";
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
  const { showToast } = useToast();
  const lastToastId = useRef(0);

  useEffect(() => {
    if (game.message && game.message.id !== lastToastId.current) {
      lastToastId.current = game.message.id;
      showToast(game.message.text);
    }
  }, [game.message, showToast]);

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-tile-border px-4 py-3">
        <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
          Wordlelo
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-between gap-6 px-4 py-6">
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
