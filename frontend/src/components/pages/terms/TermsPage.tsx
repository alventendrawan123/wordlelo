import Link from "next/link";

export function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 bg-background px-6 py-12 text-foreground">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        ← Back to game
      </Link>
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-sm leading-6 text-foreground/80">
        Wordlelo is a free daily word game. By using it you agree to play it as
        intended and not to abuse, automate, or attempt to exploit the service.
      </p>
      <p className="text-sm leading-6 text-foreground/80">
        Game results can be recorded on the Celo blockchain through a
        transaction you sign with your own wallet. On-chain transactions are
        public, permanent, and outside our control. You are responsible for your
        wallet and any network fees.
      </p>
      <p className="text-sm leading-6 text-foreground/80">
        The game is provided “as is”, without warranties of any kind. We are not
        liable for any loss arising from use of the game or the blockchain.
      </p>
    </main>
  );
}
