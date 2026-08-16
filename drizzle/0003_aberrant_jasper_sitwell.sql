ALTER TYPE "public"."game_phase" ADD VALUE 'HUNTER_SHOT' BEFORE 'GAME_OVER';--> statement-breakpoint
ALTER TYPE "public"."queue_step" ADD VALUE 'HUNTER_MARK' BEFORE 'PROTECTOR_PROTECT';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'HUNTER';