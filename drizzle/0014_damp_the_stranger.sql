CREATE TYPE "public"."game_mode" AS ENUM('MODERATED', 'SELF');--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "is_host" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mode" "game_mode" DEFAULT 'MODERATED' NOT NULL;