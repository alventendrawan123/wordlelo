import { MAX_GUESSES, WORD_LENGTH } from "@/types/game";

const PLACEHOLDER_ROWS = Array.from({ length: MAX_GUESSES }, (_, row) =>
  Array.from({ length: WORD_LENGTH }, (_, col) => `r${row}c${col}`),
);

export function MainPage() {
  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-tile-border px-4 py-3">
        <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
          Wordlelo
        </h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-6">
        <div className="grid gap-1.5" aria-hidden="true">
          {PLACEHOLDER_ROWS.map((cells) => (
            <div key={cells[0]} className="flex gap-1.5">
              {cells.map((id) => (
                <div
                  key={id}
                  className="size-14 rounded-sm border-2 border-tile-border"
                />
              ))}
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground/60">
          Daily word · 6 guesses · settles on Celo
        </p>
      </main>
    </div>
  );
}
