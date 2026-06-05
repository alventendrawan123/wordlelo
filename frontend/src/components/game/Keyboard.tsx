"use client";

import { KEYBOARD_ROWS, type KeyboardState } from "@/lib/game/keyboard";
import { Key } from "./Key";

const ACTION_KEYS = new Set(["Enter", "Backspace"]);

export interface KeyboardProps {
  keyStates: KeyboardState;
  onKey?: (key: string) => void;
}

export function Keyboard({ keyStates, onKey }: KeyboardProps) {
  const press = onKey ?? (() => undefined);

  return (
    <div className="flex w-full max-w-lg flex-col gap-1.5">
      {KEYBOARD_ROWS.map((row) => (
        <div key={row.join("")} className="flex justify-center gap-1.5">
          {row.map((label) => (
            <Key
              key={label}
              label={label}
              state={keyStates[label]}
              wide={ACTION_KEYS.has(label)}
              onPress={press}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
