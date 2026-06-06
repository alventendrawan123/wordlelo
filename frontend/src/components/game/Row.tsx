import type { TileState } from "@/types/game";
import { Tile } from "./Tile";

export interface RowCell {
  id: string;
  letter: string;
  state: TileState;
}

export interface RowProps {
  cells: RowCell[];
  shake?: boolean;
  reveal?: boolean;
}

export function Row({ cells, shake = false, reveal = false }: RowProps) {
  return (
    <div className={`flex gap-1.5 ${shake ? "anim-shake" : ""}`}>
      {cells.map((cell, col) => (
        <Tile
          key={cell.id}
          letter={cell.letter}
          state={cell.state}
          revealDelayMs={reveal ? col * 100 : null}
        />
      ))}
    </div>
  );
}
