import Link from "next/link";

export function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 bg-background px-6 py-12 text-foreground">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        ← Back to game
      </Link>
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-sm leading-6 text-foreground/80">
        Wordlelo does not collect personal information and does not run
        third-party trackers or analytics.
      </p>
      <p className="text-sm leading-6 text-foreground/80">
        Your game progress, statistics, and settings are stored only in your
        browser’s local storage on your device. Clearing your browser data
        removes them.
      </p>
      <p className="text-sm leading-6 text-foreground/80">
        If you connect a wallet, your public address is used to read and submit
        your game results on the Celo blockchain. On-chain data is public by
        nature. We never access your private keys.
      </p>
    </main>
  );
}
