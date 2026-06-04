import { Board } from "@/components/game/Board";
import { Keyboard } from "@/components/game/Keyboard";

export function MainPage() {
  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-tile-border px-4 py-3">
        <h1 className="text-3xl font-bold uppercase tracking-[0.3em]">
          Wordlelo
        </h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-between gap-6 px-4 py-4">
        <div className="flex flex-1 items-center">
          <Board rows={[]} current="" />
        </div>
        <Keyboard keyStates={{}} />
      </main>
    </div>
  );
}
