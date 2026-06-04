import type { LetterState, TileState } from "@/types/game";
import { MAX_GUESSES, WORD_LENGTH } from "@/types/game";
import { Row, type RowCell } from "./Row";

export interface BoardSubmittedRow {
  guess: string;
  marks: LetterState[] | null;
}

export interface BoardProps {
  rows: BoardSubmittedRow[];
  current: string;
  shakeRowIndex?: number | null;
}

function buildRowCells(
  rowIndex: number,
  rows: BoardSubmittedRow[],
  current: string,
): RowCell[] {
  const submitted = rowIndex < rows.length ? rows[rowIndex] : undefined;
  const isCurrent = rowIndex === rows.length;

  return Array.from({ length: WORD_LENGTH }, (_, col): RowCell => {
    const id = `r${rowIndex}c${col}`;
    if (submitted) {
      const state: TileState = submitted.marks
        ? submitted.marks[col]
        : "filled";
      return { id, letter: submitted.guess[col], state };
    }
    if (isCurrent && col < current.length) {
      return { id, letter: current[col], state: "filled" };
    }
    return { id, letter: "", state: "empty" };
  });
}

export function Board({ rows, current, shakeRowIndex = null }: BoardProps) {
  const rowIndexes = Array.from({ length: MAX_GUESSES }, (_, i) => i);

  return (
    <section className="grid gap-1.5" aria-label="Wordlelo board">
      {rowIndexes.map((rowIndex) => (
        <Row
          key={`row-${rowIndex}`}
          cells={buildRowCells(rowIndex, rows, current)}
          shake={rowIndex === shakeRowIndex}
        />
      ))}
    </section>
  );
}
