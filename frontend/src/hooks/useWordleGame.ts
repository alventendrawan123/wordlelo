"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { isGameApiError } from "@/lib/api/errors";
import { type DailyPuzzle, letterStateSchema } from "@/lib/api/schemas";
import { gameApi } from "@/lib/api/wordle";
import { dayStorageKey } from "@/lib/game/day";
import { checkHardMode } from "@/lib/game/hardMode";
import { type KeyboardState, mergeKeyStates } from "@/lib/game/keyboard";
import {
  type GameState,
  type LetterState,
  MAX_GUESSES,
  WORD_LENGTH,
} from "@/types/game";

export interface SubmittedRow {
  guess: string;
  marks: LetterState[];
}

export interface GameMessage {
  id: number;
  text: string;
}

const persistedGameSchema = z.object({
  day: z.number().int(),
  rows: z.array(
    z.object({ guess: z.string(), marks: z.array(letterStateSchema) }),
  ),
  gameState: z.enum(["not_started", "in_progress", "won", "lost"]),
  hardMode: z.boolean(),
});

type PersistedGame = z.infer<typeof persistedGameSchema>;

function loadGame(day: number): PersistedGame | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(dayStorageKey(day));
  if (raw === null) {
    return null;
  }
  try {
    const parsed = persistedGameSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.day === day ? parsed.data : null;
  } catch {
    return null;
  }
}

function saveGame(state: PersistedGame): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(dayStorageKey(state.day), JSON.stringify(state));
}

function deriveKeyStates(rows: SubmittedRow[]): KeyboardState {
  return rows.reduce<KeyboardState>(
    (acc, row) => mergeKeyStates(acc, row.guess, row.marks),
    {},
  );
}

export function useWordleGame() {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState<SubmittedRow[]>([]);
  const [current, setCurrent] = useState("");
  const [keyStates, setKeyStates] = useState<KeyboardState>({});
  const [gameState, setGameState] = useState<GameState>("in_progress");
  const [hardMode, setHardModeState] = useState(false);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<GameMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const rowsRef = useRef(rows);
  const messageIdRef = useRef(0);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const notify = useCallback((text: string) => {
    messageIdRef.current += 1;
    setMessage({ id: messageIdRef.current, text });
  }, []);

  const shake = useCallback((rowIndex: number) => {
    setShakeRowIndex(rowIndex);
    window.setTimeout(() => setShakeRowIndex(null), 600);
  }, []);

  useEffect(() => {
    let active = true;
    gameApi
      .getDailyPuzzle()
      .then((daily) => {
        if (!active) {
          return;
        }
        setPuzzle(daily);
        const saved = loadGame(daily.day);
        if (saved) {
          setRows(saved.rows);
          setGameState(saved.gameState);
          setHardModeState(saved.hardMode);
          setKeyStates(deriveKeyStates(saved.rows));
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || error || !puzzle) {
      return;
    }
    saveGame({ day: puzzle.day, rows, gameState, hardMode });
  }, [puzzle, loading, error, rows, gameState, hardMode]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), 1600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const submit = useCallback(async () => {
    if (busy || gameState === "won" || gameState === "lost") {
      return;
    }
    if (current.length !== WORD_LENGTH) {
      notify("Not enough letters");
      shake(rows.length);
      return;
    }
    if (hardMode) {
      const violation = checkHardMode(current, rows);
      if (violation) {
        notify(violation.message);
        shake(rows.length);
        return;
      }
    }

    setBusy(true);
    try {
      const result = await gameApi.submitGuess({ guess: current, hardMode });
      const nextRows = [...rows, { guess: current, marks: result.marks }];
      setRows(nextRows);
      setKeyStates((prev) => mergeKeyStates(prev, current, result.marks));
      setCurrent("");
      if (result.won) {
        setGameState("won");
        notify("Splendid!");
      } else if (nextRows.length >= MAX_GUESSES) {
        setGameState("lost");
        notify("Better luck next time");
      }
    } catch (err) {
      notify(isGameApiError(err) ? err.message : "Something went wrong");
      shake(rows.length);
    } finally {
      setBusy(false);
    }
  }, [busy, gameState, current, hardMode, rows, notify, shake]);

  const handleKey = useCallback(
    (rawKey: string) => {
      if (gameState === "won" || gameState === "lost" || busy) {
        return;
      }
      if (rawKey === "Enter") {
        void submit();
        return;
      }
      if (rawKey === "Backspace") {
        setCurrent((value) => value.slice(0, -1));
        return;
      }
      const ch = rawKey.toUpperCase();
      if (/^[A-Z]$/.test(ch)) {
        setCurrent((value) =>
          value.length < WORD_LENGTH ? value + ch : value,
        );
      }
    },
    [gameState, busy, submit],
  );

  const handleKeyRef = useRef(handleKey);

  useEffect(() => {
    handleKeyRef.current = handleKey;
  }, [handleKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      handleKeyRef.current(event.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setHardMode = useCallback((value: boolean) => {
    if (rowsRef.current.length === 0) {
      setHardModeState(value);
    }
  }, []);

  return {
    puzzle,
    loading,
    error,
    rows,
    current,
    keyStates,
    gameState,
    hardMode,
    shakeRowIndex,
    message,
    busy,
    handleKey,
    setHardMode,
  };
}
