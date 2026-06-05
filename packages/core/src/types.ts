/** Result of scoring one letter of a guess against the answer. */
export type Mark = "green" | "yellow" | "gray";

/** A scored guess row — used for hard-mode validation and board rehydration. */
export interface ScoredRow {
  guess: string;
  marks: Mark[];
}
