CREATE TYPE "public"."game_phase" AS ENUM('SETUP', 'ROLE_REVEAL', 'READY_CHECK', 'NIGHT', 'NIGHT_RESOLUTION', 'DAY', 'VOTE', 'VOTE_RESOLUTION', 'GAME_OVER');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('LOBBY', 'IN_PROGRESS', 'GAME_OVER');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('VILLAGER', 'WEREWOLF', 'SEER', 'WITCH');--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"phase" "game_phase" NOT NULL,
	"type" text NOT NULL,
	"actor_player_id" uuid,
	"target_player_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"role" "role",
	"is_moderator" boolean DEFAULT false NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"is_alive" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"status" "game_status" DEFAULT 'LOBBY' NOT NULL,
	"phase" "game_phase" DEFAULT 'SETUP' NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_actor_player_id_game_players_id_fk" FOREIGN KEY ("actor_player_id") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_target_player_id_game_players_id_fk" FOREIGN KEY ("target_player_id") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;