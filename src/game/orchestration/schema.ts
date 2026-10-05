import z from 'zod'

import {
  eliminationCauseSchema,
  nightResolutionSchema,
  voteResolutionSchema,
  nightActionSchema,
} from '../rules/schema'
import {
  gamePhaseSchema,
  queueStepSchema,
  winnerSchema,
  teamSchema,
} from '../schema'

// Đây là runtime representation của mọi command mà orchestration hỗ trợ.
// oRPC dùng schema để validate request trước khi command vào rule engine.
export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SUBMIT_NIGHT_ACTION'),
    action: nightActionSchema,
  }),
  z.object({ type: z.literal('CONFIRM_STEP') }),
  z.object({ type: z.literal('REJECT_STEP'), reason: z.string().min(1) }),
  z.object({ type: z.literal('SKIP_STEP'), reason: z.string().min(1) }),
  // Revamp MODERATED (M9): hoàn tác action đêm cuối cùng — lý do bắt buộc.
  z.object({ type: z.literal('UNDO_STEP'), reason: z.string().min(1) }),
  // Revamp MODERATED (M10): đánh dấu người chơi chết tay vì ngoại lệ bàn
  // (bỏ về giữa ván…) — lý do bắt buộc để audit.
  z.object({
    type: z.literal('MODERATOR_OVERRIDE_MARK_DEAD'),
    playerId: z.string().min(1),
    reason: z.string().min(1),
  }),
  z.object({ type: z.literal('CONFIRM_NIGHT_RESOLUTION') }),
  z.object({ type: z.literal('START_VOTE') }),
  z.object({
    // SELF mode (R21): player bấm "Sẵn sàng bỏ phiếu" trong pha DAY.
    type: z.literal('SUBMIT_VOTE_CONSENT'),
    actorId: z.string().min(1),
  }),
  z.object({
    type: z.literal('SUBMIT_VOTE'),
    // SELF mode: player bỏ phiếu trên thiết bị. targetId NULL = phiếu trắng.
    actorId: z.string().min(1),
    targetId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('SUBMIT_VOTE_RESULT'),
    tied: z.boolean(),
    selectedPlayerId: z.string().min(1).nullable(),
  }),
  z.object({ type: z.literal('CONFIRM_VOTE_RESULT') }),
  z.object({ type: z.literal('SKIP_REVOTE') }),
  z.object({
    type: z.literal('SUBMIT_HUNTER_SHOT'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({ type: z.literal('CONFIRM_HUNTER_SHOT') }),
  // R22: Thợ săn không bắn đúng hạn (SELF) — mất phát bắn, ván đi tiếp.
  z.object({ type: z.literal('SKIP_HUNTER_SHOT') }),
  // R23: kết thúc ván sớm — Quản trò (MODERATED) hoặc chủ phòng (SELF).
  z.object({ type: z.literal('END_GAME'), reason: z.string().min(1) }),
])

// Revamp MODERATED (M4): nguồn nhập của action — dùng cho audit và nhãn
// "do quản trò nhập" trên thiết bị người chơi.
export const enteredBySchema = z.enum(['PLAYER', 'MODERATOR'])
export type EnteredBy = z.infer<typeof enteredBySchema>

// Event cũng là một IO boundary vì được lưu vào PostgreSQL dưới dạng type + JSONB.
// Discriminated union bảo đảm mỗi type chỉ đi cùng payload tương ứng.
export const gameEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PHASE_CHANGED'),
    from: gamePhaseSchema,
    to: gamePhaseSchema,
  }),
  z.object({
    type: z.literal('QUEUE_STEP_ACTIVATED'),
    step: queueStepSchema,
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_SUBMITTED'),
    action: nightActionSchema,
    // Revamp MODERATED (M4): ai là người nhập action — người chơi trên thiết
    // bị hay quản trò nhập thay. Optional: event cũ trong DB không có trường.
    enteredBy: enteredBySchema.optional(),
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_CONFIRMED'),
    action: nightActionSchema,
    enteredBy: enteredBySchema.optional(),
  }),
  z.object({
    type: z.literal('SEER_RESULT_RECORDED'),
    seerPlayerId: z.string().min(1),
    targetPlayerId: z.string().min(1),
    result: teamSchema,
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_REJECTED'),
    action: nightActionSchema,
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal('QUEUE_STEP_SKIPPED'),
    step: queueStepSchema,
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal('NIGHT_RESOLUTION_PREPARED'),
    resolution: nightResolutionSchema,
  }),
  z.object({
    type: z.literal('PLAYER_DIED'),
    playerId: z.string().min(1),
    causes: z.array(eliminationCauseSchema),
  }),
  z.object({
    type: z.literal('VOTE_SUBMITTED'),
    tied: z.boolean(),
    selectedPlayerId: z.string().min(1).nullable(),
  }),
  z.object({
    // SELF mode: audit-only — projection KHÔNG đưa vào public/private history
    // để nội dung phiếu không lộ trước khi bot tally xong (chống bandwagon).
    type: z.literal('VOTE_CAST'),
    actorId: z.string().min(1),
    targetId: z.string().min(1).nullable(),
  }),
  z.object({
    // SELF mode: audit-only — count consent hiển thị qua projection riêng.
    type: z.literal('VOTE_CONSENT_CAST'),
    actorId: z.string().min(1),
  }),
  z.object({
    type: z.literal('VOTE_RESOLVED'),
    resolution: voteResolutionSchema,
  }),
  z.object({
    type: z.literal('REVOTE_SKIPPED'),
  }),
  z.object({ type: z.literal('GAME_ENDED'), winner: winnerSchema }),
  z.object({
    type: z.literal('HUNTER_SHOT_SUBMITTED'),
    hunterId: z.string().min(1),
    targetId: z.string().min(1),
    enteredBy: enteredBySchema.optional(),
  }),
  z.object({
    type: z.literal('HUNTER_SHOT_CONFIRMED'),
    hunterId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  // Audit-only: bot/hệ thống bỏ qua phát bắn (hết giờ R22).
  z.object({ type: z.literal('HUNTER_SHOT_SKIPPED') }),
  // Revamp MODERATED (M9): audit hoàn tác — projection xóa các entry riêng
  // tương ứng với action này khỏi history của chủ role (bù trừ, xem
  // project-game-view). Reason mang ngữ cảnh vì sao quản trò hoàn tác.
  z.object({
    type: z.literal('STEP_UNDONE'),
    step: queueStepSchema,
    action: nightActionSchema,
    reason: z.string().min(1),
  }),
  // Revamp MODERATED (M10): đánh dấu chết tay — audit-only, công khai chỉ qua
  // PLAYER_DIED do handler phát kèm.
  z.object({
    type: z.literal('PLAYER_OVERRIDE_APPLIED'),
    playerId: z.string().min(1),
    reason: z.string().min(1),
  }),
  // R23: kết thúc ván sớm — audit-only (công khai chỉ qua PHASE_CHANGED).
  z.object({
    type: z.literal('GAME_ENDED_MANUAL'),
    reason: z.string().min(1),
  }),
])
