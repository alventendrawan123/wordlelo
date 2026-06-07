CREATE TABLE IF NOT EXISTS "daily_words" (
	"day" integer PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"salt" text NOT NULL,
	"commitment" text NOT NULL,
	"commit_tx" text,
	"reveal_tx" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indexer_state" (
	"key" text PRIMARY KEY NOT NULL,
	"last_block" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "results" (
	"player" text NOT NULL,
	"day" integer NOT NULL,
	"guesses" smallint NOT NULL,
	"won" boolean NOT NULL,
	"hard_mode" boolean NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" bigint NOT NULL,
	"settled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "results_player_day_pk" PRIMARY KEY("player","day")
);
