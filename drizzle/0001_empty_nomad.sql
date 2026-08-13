CREATE TYPE "public"."action_status" AS ENUM('SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."command_receipt_status" AS ENUM('ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."game_session_kind" AS ENUM('MODERATOR', 'PLAYER');--> statement-breakpoint
CREATE TYPE "public"."queue_step" AS ENUM('SEER_INSPECT', 'WEREWOLF_ATTACK', 'WITCH_ACTION');--> statement-breakpoint
CREATE TYPE "public"."queue_step_status" AS ENUM('PENDING', 'ACTIVE', 'WAITING_MODERATOR_CONFIRMATION', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "command_receipts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "command_receipts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"command_type" text NOT NULL,
	"expected_version" integer NOT NULL,
	"resulting_version" integer NOT NULL,
	"status" "command_receipt_status" NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_receipts_session_idempotency_key_unique" UNIQUE("session_id","idempotency_key"),
	CONSTRAINT "command_receipts_idempotency_key_not_blank_check" CHECK (length(btrim("command_receipts"."idempotency_key")) > 0),
	CONSTRAINT "command_receipts_request_hash_format_check" CHECK ("command_receipts"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "command_receipts_expected_version_positive_check" CHECK ("command_receipts"."expected_version" > 0),
	CONSTRAINT "command_receipts_resulting_version_positive_check" CHECK ("command_receipts"."resulting_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "game_actions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_actions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"queue_step_id" bigint NOT NULL,
	"actor_player_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"type" "queue_step" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "action_status" DEFAULT 'SUBMITTED' NOT NULL,
	"rejection_reason" text,
	"decided_by_session_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "game_actions_queue_step_attempt_unique" UNIQUE("queue_step_id","attempt"),
	CONSTRAINT "game_actions_attempt_positive_check" CHECK ("game_actions"."attempt" > 0),
	CONSTRAINT "game_actions_decision_check" CHECK (("game_actions"."status" = 'SUBMITTED' AND "game_actions"."decided_at" IS NULL AND "game_actions"."decided_by_session_id" IS NULL AND "game_actions"."rejection_reason" IS NULL) OR ("game_actions"."status" = 'CONFIRMED' AND "game_actions"."decided_at" IS NOT NULL AND "game_actions"."decided_by_session_id" IS NOT NULL AND "game_actions"."rejection_reason" IS NULL) OR ("game_actions"."status" IN ('REJECTED', 'CANCELLED') AND "game_actions"."decided_at" IS NOT NULL AND "game_actions"."decided_by_session_id" IS NOT NULL AND length(btrim("game_actions"."rejection_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "game_queue_steps" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_queue_steps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"step" "queue_step" NOT NULL,
	"status" "queue_step_status" DEFAULT 'PENDING' NOT NULL,
	"skip_reason" text,
	"activated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_queue_steps_game_id_id_unique" UNIQUE("game_id","id"),
	CONSTRAINT "game_queue_steps_game_id_id_step_unique" UNIQUE("game_id","id","step"),
	CONSTRAINT "game_queue_steps_game_round_position_unique" UNIQUE("game_id","round","position"),
	CONSTRAINT "game_queue_steps_game_round_step_unique" UNIQUE("game_id","round","step"),
	CONSTRAINT "game_queue_steps_round_positive_check" CHECK ("game_queue_steps"."round" > 0),
	CONSTRAINT "game_queue_steps_position_positive_check" CHECK ("game_queue_steps"."position" > 0),
	CONSTRAINT "game_queue_steps_skip_reason_check" CHECK (("game_queue_steps"."status" = 'SKIPPED' AND length(btrim("game_queue_steps"."skip_reason")) > 0) OR ("game_queue_steps"."status" <> 'SKIPPED' AND "game_queue_steps"."skip_reason" IS NULL)),
	CONSTRAINT "game_queue_steps_lifecycle_check" CHECK (("game_queue_steps"."status" = 'PENDING' AND "game_queue_steps"."activated_at" IS NULL AND "game_queue_steps"."completed_at" IS NULL) OR ("game_queue_steps"."status" IN ('ACTIVE', 'WAITING_MODERATOR_CONFIRMATION') AND "game_queue_steps"."activated_at" IS NOT NULL AND "game_queue_steps"."completed_at" IS NULL) OR ("game_queue_steps"."status" IN ('COMPLETED', 'SKIPPED') AND "game_queue_steps"."activated_at" IS NOT NULL AND "game_queue_steps"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid,
	"kind" "game_session_kind" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_sessions_game_id_id_unique" UNIQUE("game_id","id"),
	CONSTRAINT "game_sessions_kind_player_check" CHECK (("game_sessions"."kind" = 'MODERATOR' AND "game_sessions"."player_id" IS NULL) OR ("game_sessions"."kind" = 'PLAYER' AND "game_sessions"."player_id" IS NOT NULL)),
	CONSTRAINT "game_sessions_token_hash_format_check" CHECK ("game_sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "game_sessions_expiry_check" CHECK ("game_sessions"."expires_at" > "game_sessions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_actor_player_id_game_players_id_fk";
--> statement-breakpoint
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_target_player_id_game_players_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "settings" SET DEFAULT '{"revealRoleOnDeath":false,"seerResult":"TEAM_ALIGNMENT","voteTie":"REVOTE_ONCE","witchCanSelfHeal":true,"witchCanUseBothPotions":true,"witchCanSelfPoison":false}'::jsonb;--> statement-breakpoint
UPDATE "games"
SET "settings" = '{"revealRoleOnDeath":false,"seerResult":"TEAM_ALIGNMENT","voteTie":"REVOTE_ONCE","witchCanSelfHeal":true,"witchCanUseBothPotions":true,"witchCanSelfPoison":false}'::jsonb || "settings";--> statement-breakpoint
ALTER TABLE "game_events" ADD COLUMN "sequence" integer;--> statement-breakpoint
WITH "numbered_events" AS (
	SELECT "id", row_number() OVER (PARTITION BY "game_id" ORDER BY "created_at", "id")::integer AS "sequence"
	FROM "game_events"
)
UPDATE "game_events"
SET "sequence" = "numbered_events"."sequence"
FROM "numbered_events"
WHERE "game_events"."id" = "numbered_events"."id";--> statement-breakpoint
ALTER TABLE "game_events" ALTER COLUMN "sequence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "ability_state" jsonb;--> statement-breakpoint
UPDATE "game_players"
SET "ability_state" = '{"healingPotionAvailable":true,"poisonPotionAvailable":true}'::jsonb
WHERE "role" = 'WITCH';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "moderator_name" text;--> statement-breakpoint
UPDATE "games" SET "moderator_name" = 'Moderator' WHERE "moderator_name" IS NULL;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "moderator_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "state" jsonb;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_id_unique" UNIQUE("game_id","id");--> statement-breakpoint
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_game_session_fk" FOREIGN KEY ("game_id","session_id") REFERENCES "public"."game_sessions"("game_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_queue_step_fk" FOREIGN KEY ("game_id","queue_step_id","type") REFERENCES "public"."game_queue_steps"("game_id","id","step") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_actor_player_fk" FOREIGN KEY ("game_id","actor_player_id") REFERENCES "public"."game_players"("game_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_decider_session_fk" FOREIGN KEY ("game_id","decided_by_session_id") REFERENCES "public"."game_sessions"("game_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_queue_steps" ADD CONSTRAINT "game_queue_steps_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_player_fk" FOREIGN KEY ("game_id","player_id") REFERENCES "public"."game_players"("game_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "command_receipts_game_created_at_idx" ON "command_receipts" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_actions_one_open_per_queue_step_idx" ON "game_actions" USING btree ("queue_step_id") WHERE "game_actions"."status" IN ('SUBMITTED', 'CONFIRMED');--> statement-breakpoint
CREATE INDEX "game_actions_game_queue_attempt_idx" ON "game_actions" USING btree ("game_id","queue_step_id","attempt");--> statement-breakpoint
CREATE INDEX "game_actions_actor_player_id_idx" ON "game_actions" USING btree ("actor_player_id");--> statement-breakpoint
CREATE INDEX "game_actions_decided_by_session_id_idx" ON "game_actions" USING btree ("decided_by_session_id");--> statement-breakpoint
CREATE INDEX "game_queue_steps_game_status_idx" ON "game_queue_steps" USING btree ("game_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "game_sessions_token_hash_unique_idx" ON "game_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "game_sessions_game_id_idx" ON "game_sessions" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_sessions_active_expiry_idx" ON "game_sessions" USING btree ("expires_at") WHERE "game_sessions"."revoked_at" IS NULL;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_actor_player_fk" FOREIGN KEY ("game_id","actor_player_id") REFERENCES "public"."game_players"("game_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_target_player_fk" FOREIGN KEY ("game_id","target_player_id") REFERENCES "public"."game_players"("game_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_events_game_created_at_idx" ON "game_events" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "game_events_game_round_phase_idx" ON "game_events" USING btree ("game_id","round","phase");--> statement-breakpoint
CREATE INDEX "game_events_actor_player_id_idx" ON "game_events" USING btree ("actor_player_id");--> statement-breakpoint
CREATE INDEX "game_events_target_player_id_idx" ON "game_events" USING btree ("target_player_id");--> statement-breakpoint
CREATE INDEX "game_events_game_type_idx" ON "game_events" USING btree ("game_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_game_display_name_unique_idx" ON "game_players" USING btree ("game_id",lower(btrim("display_name")));--> statement-breakpoint
CREATE INDEX "game_players_game_id_idx" ON "game_players" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "games_status_updated_at_idx" ON "games" USING btree ("status","updated_at");--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_sequence_unique" UNIQUE("game_id","sequence");--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_sequence_positive_check" CHECK ("game_events"."sequence" > 0);--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_round_nonnegative_check" CHECK ("game_events"."round" >= 0);--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_created_by_check" CHECK ("game_events"."created_by" IN ('SYSTEM', 'MODERATOR', 'PLAYER'));--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_display_name_not_blank_check" CHECK (length(btrim("game_players"."display_name")) > 0);--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_role_ability_check" CHECK (("game_players"."role" = 'WITCH' AND "game_players"."ability_state" IS NOT NULL) OR ("game_players"."role" <> 'WITCH' AND "game_players"."ability_state" IS NULL) OR ("game_players"."role" IS NULL AND "game_players"."ability_state" IS NULL));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_room_code_format_check" CHECK ("games"."room_code" ~ '^[A-Z0-9]{6}$');--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_moderator_name_not_blank_check" CHECK (length(btrim("games"."moderator_name")) > 0);--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_round_nonnegative_check" CHECK ("games"."round" >= 0);--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_version_positive_check" CHECK ("games"."version" > 0);
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_queue_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "command_receipts" ENABLE ROW LEVEL SECURITY;
