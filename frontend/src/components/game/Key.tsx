import type { LetterState } from "@/types/game";

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-correct text-tile-text",
  present: "bg-present text-tile-text",
  absent: "bg-absent text-tile-text",
};

export interface KeyProps {
  label: string;
  state?: LetterState;
  wide?: boolean;
  onPress: (label: string) => void;
}

export function Key({ label, state, wide = false, onPress }: KeyProps) {
  const stateClass = state ? STATE_CLASSES[state] : "bg-key text-key-text";
  const sizeClass = wide ? "px-2.5 text-[0.7rem]" : "w-8 sm:w-10";

  return (
    <button
      type="button"
      onClick={() => onPress(label)}
      className={`flex h-14 ${sizeClass} select-none items-center justify-center rounded font-semibold uppercase ${stateClass}`}
    >
      {label === "Backspace" ? "⌫" : label}
    </button>
  );
}
