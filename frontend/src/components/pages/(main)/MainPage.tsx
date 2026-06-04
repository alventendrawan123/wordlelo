import { Board } from "@/components/game/Board";

export function MainPage() {
  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-tile-border px-4 py-3">
        <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
          Wordlelo
        </h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-6">
        <Board rows={[]} current="" />
        <p className="text-sm text-foreground/60">
          Daily word · 6 guesses · settles on Celo
        </p>
      </main>
    </div>
  );
}
