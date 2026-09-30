import type { CommandReceiptInput, DatabaseTransaction } from './shared'
import type { GameMutationResult, StoreResult } from '../model'
import type { ExecuteGameCommandInput } from '../game-store'

import { createHash } from 'node:crypto'

import { commandReceipts } from '#/db/schema'
import { and, eq } from 'drizzle-orm'

import { storeErrorCodeSchema, gameMutationResultSchema } from '../schema'
import { gameCommandSchema } from '../../orchestration/schema'

import { failure } from './shared'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

export function hashCommandRequest(input: ExecuteGameCommandInput): string {
  return hashMutationRequest({
    expectedVersion: input.expectedVersion,
    command: gameCommandSchema.parse(input.command),
  })
}

export function hashMutationRequest(request: unknown): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex')
}

export async function replayCommandReceipt(
  transaction: DatabaseTransaction,
  sessionId: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<StoreResult<GameMutationResult> | null> {
  const [receipt] = await transaction
    .select({
      requestHash: commandReceipts.requestHash,
      response: commandReceipts.response,
    })
    .from(commandReceipts)
    .where(
      and(
        eq(commandReceipts.sessionId, sessionId),
        eq(commandReceipts.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1)

  if (!receipt) return null
  if (receipt.requestHash !== requestHash) {
    return failure(
      STORE_ERROR_CODE.IDEMPOTENCY_KEY_REUSED,
      'Idempotency key was already used for another command',
    )
  }
  return {
    ok: true,
    value: gameMutationResultSchema.parse(receipt.response),
  }
}

export async function saveCommandReceipt(
  transaction: DatabaseTransaction,
  input: CommandReceiptInput,
): Promise<void> {
  await transaction.insert(commandReceipts).values({
    gameId: input.gameId,
    sessionId: input.sessionId,
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    commandType: input.commandType,
    expectedVersion: input.expectedVersion,
    resultingVersion: input.result.version,
    status: 'ACCEPTED',
    response: input.result,
  })
}
