import type { TileState } from "@/types/game";

const STATE_CLASSES: Record<TileState, string> = {
  empty: "border-tile-border text-foreground",
  filled: "border-tile-border-filled text-foreground",
  correct: "border-correct bg-correct text-tile-text",
  present: "border-present bg-present text-tile-text",
  absent: "border-absent bg-absent text-tile-text",
};

export interface TileProps {
  letter: string;
  state: TileState;
  revealDelayMs?: number | null;
}

export function Tile({ letter, state, revealDelayMs = null }: TileProps) {
  const isReveal =
    revealDelayMs !== null && state !== "empty" && state !== "filled";

  return (
    <div
      className={`flex size-14 items-center justify-center rounded-sm border-2 text-3xl font-bold uppercase ${STATE_CLASSES[state]} ${isReveal ? "anim-flip" : ""}`}
      style={isReveal ? { animationDelay: `${revealDelayMs}ms` } : undefined}
    >
      {letter}
    </div>
  );
}
