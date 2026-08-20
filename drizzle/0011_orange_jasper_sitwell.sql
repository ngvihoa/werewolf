ALTER TABLE "game_players" DROP CONSTRAINT "game_players_role_ability_check";--> statement-breakpoint
ALTER TYPE "public"."role" RENAME TO "role_old";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('VILLAGER', 'WEREWOLF', 'ALPHA_WEREWOLF', 'HYBRID_WOLF', 'SEER', 'WITCH', 'PROTECTOR', 'HUNTER', 'ELDER', 'FOOL', 'PIPER', 'CUPID', 'COURTESAN');--> statement-breakpoint
ALTER TABLE "game_players" ALTER COLUMN "role" TYPE "public"."role" USING "role"::text::"public"."role";--> statement-breakpoint
DROP TYPE "public"."role_old";--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_role_ability_check" CHECK (("game_players"."role" IN ('WITCH', 'ALPHA_WEREWOLF', 'ELDER', 'HYBRID_WOLF') AND "game_players"."ability_state" IS NOT NULL) OR ("game_players"."role" NOT IN ('WITCH', 'ALPHA_WEREWOLF', 'ELDER', 'HYBRID_WOLF') AND "game_players"."ability_state" IS NULL) OR ("game_players"."role" IS NULL AND "game_players"."ability_state" IS NULL));
