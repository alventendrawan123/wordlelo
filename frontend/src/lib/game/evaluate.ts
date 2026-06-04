import type { LetterState } from "@/types/game";

export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const marks: LetterState[] = Array.from(
    { length: g.length },
    (): LetterState => "absent",
  );
  const remaining: Record<string, number> = {};

  for (const ch of a) {
    remaining[ch] = (remaining[ch] ?? 0) + 1;
  }

  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      marks[i] = "correct";
      remaining[g[i]] -= 1;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (marks[i] === "correct") {
      continue;
    }
    const ch = g[i];
    if ((remaining[ch] ?? 0) > 0) {
      marks[i] = "present";
      remaining[ch] -= 1;
    }
  }

  return marks;
}

export function isWin(marks: LetterState[]): boolean {
  return marks.length > 0 && marks.every((m) => m === "correct");
}
