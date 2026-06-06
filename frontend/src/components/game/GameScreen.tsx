"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useToast } from "@/components/feedback/ToastProvider";
import { Header } from "@/components/layout/Header";
import { HelpModal } from "@/components/modals/HelpModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { StatsModal } from "@/components/stats/StatsModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useGameStats } from "@/hooks/useGameStats";
import { useOnChainStreak } from "@/hooks/useOnChainStreak";
import type { SubmittedRow } from "@/hooks/useWordleGame";
import { useWordleGame } from "@/hooks/useWordleGame";
import type { ShareOptions } from "@/lib/game/share";
import { MAX_GUESSES } from "@/types/game";
import { Board } from "./Board";
import { Keyboard } from "./Keyboard";

type ModalKind = "help" | "stats" | "settings" | null;

interface BoardAreaProps {
  loading: boolean;
  error: boolean;
  rows: SubmittedRow[];
  current: string;
  shakeRowIndex: number | null;
  revealRowIndex: number | null;
}

function BoardArea({
  loading,
  error,
  rows,
  current,
  shakeRowIndex,
  revealRowIndex,
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
      <Board
        rows={rows}
        current={current}
        shakeRowIndex={shakeRowIndex}
        revealRowIndex={revealRowIndex}
      />
    </div>
  );
}

export function GameScreen() {
  const { showToast } = useToast();
  const { colorblind } = useTheme();
  const { stats, recordResult } = useGameStats();
  const { address } = useAccount();
  const onChainStreak = useOnChainStreak(address);
  const [modal, setModal] = useState<ModalKind>(null);
  const [highlightRow, setHighlightRow] = useState<number | null>(null);

  const handleComplete = useCallback(
    (won: boolean, guesses: number) => {
      recordResult(won, guesses);
      setHighlightRow(won ? guesses : null);
      window.setTimeout(() => setModal("stats"), 1200);
    },
    [recordResult],
  );

  const game = useWordleGame({ onComplete: handleComplete });
  const lastToastId = useRef(0);

  useEffect(() => {
    if (game.message && game.message.id !== lastToastId.current) {
      lastToastId.current = game.message.id;
      showToast(game.message.text);
    }
  }, [game.message, showToast]);

  const isOver = game.gameState === "won" || game.gameState === "lost";

  const shareOptions = useMemo<ShareOptions | null>(() => {
    if (!game.puzzle || !isOver) {
      return null;
    }
    return {
      day: game.puzzle.day,
      guesses: game.rows.length,
      maxGuesses: MAX_GUESSES,
      won: game.gameState === "won",
      hardMode: game.hardMode,
      colorblind,
      rows: game.rows.map((row) => row.marks),
    };
  }, [
    game.puzzle,
    game.gameState,
    game.rows,
    game.hardMode,
    colorblind,
    isOver,
  ]);

  const settle = useMemo(() => {
    if (!isOver) {
      return null;
    }
    return {
      guesses: game.rows.map((row) => row.guess),
      hardMode: game.hardMode,
    };
  }, [isOver, game.rows, game.hardMode]);

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <Header
        onOpenHelp={() => setModal("help")}
        onOpenStats={() => setModal("stats")}
        onOpenSettings={() => setModal("settings")}
      />

      <main className="flex flex-1 flex-col items-center justify-between gap-6 px-4 py-6">
        <BoardArea
          loading={game.loading}
          error={game.error}
          rows={game.rows}
          current={game.current}
          shakeRowIndex={game.shakeRowIndex}
          revealRowIndex={game.revealRowIndex}
        />

        <Keyboard keyStates={game.keyStates} onKey={game.handleKey} />
      </main>

      <HelpModal open={modal === "help"} onClose={() => setModal(null)} />
      <StatsModal
        open={modal === "stats"}
        onClose={() => setModal(null)}
        stats={stats}
        highlightRow={highlightRow}
        shareOptions={shareOptions}
        closesAt={game.puzzle?.closesAt ?? null}
        onChainStreak={onChainStreak}
        settle={settle}
      />
      <SettingsModal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        hardMode={game.hardMode}
        hardModeLocked={game.rows.length > 0}
        onToggleHardMode={() => game.setHardMode(!game.hardMode)}
      />
    </div>
  );
}
