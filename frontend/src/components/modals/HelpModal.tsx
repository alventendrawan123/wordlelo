import type { LetterState } from "@/types/game";
import { Modal } from "./Modal";

const TILE_CLASSES: Record<LetterState, string> = {
  correct: "bg-correct",
  present: "bg-present",
  absent: "bg-absent",
};

function MiniTile({ letter, state }: { letter: string; state: LetterState }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-sm text-sm font-bold text-tile-text ${TILE_CLASSES[state]}`}
    >
      {letter}
    </span>
  );
}

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <div className="space-y-3 text-sm text-foreground/80">
        <p>
          Guess the word in 6 tries. Each guess must be a valid 5-letter word.
        </p>
        <p>After each guess the tiles change color:</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <MiniTile letter="C" state="correct" />
            <span>is in the word and in the right spot.</span>
          </li>
          <li className="flex items-center gap-2">
            <MiniTile letter="E" state="present" />
            <span>is in the word but in the wrong spot.</span>
          </li>
          <li className="flex items-center gap-2">
            <MiniTile letter="L" state="absent" />
            <span>is not in the word.</span>
          </li>
        </ul>
        <p>A new puzzle drops every day — and your result settles on Celo.</p>
      </div>
    </Modal>
  );
}
