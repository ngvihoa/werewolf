import type { DatabaseTransaction } from './shared'
import type { GameCommand } from '../../orchestration/commands'
import type { GameState } from '../../orchestration/model'

import { gameActions, gamePlayers, gameQueueSteps } from '#/db/schema'
import { and, desc, eq } from 'drizzle-orm'

export async function persistGameAction(
  transaction: DatabaseTransaction,
  input: {
    gameId: string
    previousState: GameState
    command: GameCommand
    // NULL khi quyết định thuộc về quản trò bot (không có session).
    sessionId: string | null
    now: Date
  },
): Promise<void> {
  // For players
  if (input.command.type === 'SUBMIT_NIGHT_ACTION') {
    const action = input.command.action
    const [queueStep] = await transaction
      .select({ id: gameQueueSteps.id })
      .from(gameQueueSteps)
      .where(
        and(
          eq(gameQueueSteps.gameId, input.gameId),
          eq(gameQueueSteps.round, input.previousState.round),
          eq(gameQueueSteps.step, action.type),
        ),
      )
      .limit(1)

    if (!queueStep) {
      throw new Error('Active queue step is missing from the database')
    }

    const [latestAttempt] = await transaction
      .select({ attempt: gameActions.attempt })
      .from(gameActions)
      .where(eq(gameActions.queueStepId, queueStep.id))
      .orderBy(desc(gameActions.attempt))
      .limit(1)

    // `type` đã có cột riêng; JSONB chỉ giữ phần payload của action.
    const { type, ...payload } = action
    await transaction.insert(gameActions).values({
      gameId: input.gameId,
      queueStepId: queueStep.id,
      actorPlayerId: action.actorId,
      attempt: (latestAttempt?.attempt ?? 0) + 1,
      type,
      payload,
      status: 'SUBMITTED',
      submittedAt: input.now,
    })
    return
  }

  if (
    input.command.type !== 'CONFIRM_STEP' &&
    input.command.type !== 'REJECT_STEP'
  ) {
    return
  }

  // For moderator confirms/rejects

  const pendingAction = input.previousState.pendingNightAction
  if (!pendingAction) {
    throw new Error('Pending action is missing from game state')
  }

  const [storedAction] = await transaction
    .select({ id: gameActions.id })
    .from(gameActions)
    .where(
      and(
        eq(gameActions.gameId, input.gameId),
        eq(gameActions.type, pendingAction.type),
        eq(gameActions.status, 'SUBMITTED'),
      ),
    )
    .orderBy(desc(gameActions.attempt))
    .limit(1)

  if (!storedAction) {
    throw new Error('Submitted action is missing from the database')
  }

  const decision =
    input.command.type === 'REJECT_STEP'
      ? {
          status: 'REJECTED' as const,
          rejectionReason: input.command.reason.trim(),
        }
      : { status: 'CONFIRMED' as const, rejectionReason: null }

  await transaction
    .update(gameActions)
    .set({
      ...decision,
      decidedBySessionId: input.sessionId,
      decidedAt: input.now,
    })
    .where(eq(gameActions.id, storedAction.id))
}

export async function syncGamePlayers(
  transaction: DatabaseTransaction,
  gameId: string,
  state: GameState,
): Promise<void> {
  // Player count is small (5-15); explicit row updates keep this easy to audit.
  for (const player of state.players) {
    await transaction
      .update(gamePlayers)
      .set({
        isAlive: player.alive,
        abilityState: player.abilityState,
      })
      .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.id, player.id)))
  }
}

export async function syncGameQueue(
  transaction: DatabaseTransaction,
  gameId: string,
  state: GameState,
  now: Date,
): Promise<void> {
  const storedSteps = await transaction
    .select()
    .from(gameQueueSteps)
    .where(
      and(
        eq(gameQueueSteps.gameId, gameId),
        eq(gameQueueSteps.round, state.round),
      ),
    )

  const storedStepByType = new Map(storedSteps.map((step) => [step.step, step]))

  for (const [index, item] of state.queue.entries()) {
    const storedStep = storedStepByType.get(item.step)
    const active = item.status !== 'PENDING'
    const finished = item.status === 'COMPLETED' || item.status === 'SKIPPED'
    const lifecycle = {
      status: item.status,
      skipReason: item.skipReason,
      activatedAt: active ? (storedStep?.activatedAt ?? now) : null,
      completedAt: finished ? (storedStep?.completedAt ?? now) : null,
    }

    if (storedStep) {
      await transaction
        .update(gameQueueSteps)
        .set(lifecycle)
        .where(eq(gameQueueSteps.id, storedStep.id))
      continue
    }

    // Khi sang đêm mới, rule engine tạo queue mới và persistence insert
    // toàn bộ step của round đó trong transaction hiện tại.
    await transaction.insert(gameQueueSteps).values({
      gameId,
      round: state.round,
      position: index + 1,
      step: item.step,
      ...lifecycle,
      createdAt: now,
    })
  }
}
