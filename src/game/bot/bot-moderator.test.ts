import type { NightAction } from '../rules/night-actions'
import type { GameState } from '../orchestration/model'
import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import {
  createFirstNightState,
  executeCommand,
} from '../orchestration/game-orchestrator'

import { nextBotCommands, runBotLoop } from './bot-moderator'

function villager(id: string): Player {
  return { id, role: 'VILLAGER', alive: true, abilityState: null }
}

// R01: 1 Werewolf, 1 Seer, 3 Villagers.
const FIVE_PLAYERS: Player[] = [
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
  { id: 'seer', role: 'SEER', alive: true, abilityState: null },
  villager('v1'),
  villager('v2'),
  villager('v3'),
]

function submit(state: GameState, action: NightAction): GameState {
  const outcome = executeCommand(state, {
    type: 'SUBMIT_NIGHT_ACTION',
    action,
  })
  if (!outcome.ok) throw new Error(outcome.error.message)
  return outcome.value.state
}

describe('nextBotCommands', () => {
  it('không phát gì khi đêm đang chờ player hành động', () => {
    expect(nextBotCommands(createFirstNightState(FIVE_PLAYERS))).toEqual([])
  })

  it('phát CONFIRM_STEP khi có action chờ xác nhận', () => {
    const state = submit(createFirstNightState(FIVE_PLAYERS), {
      type: 'SEER_INSPECT',
      actorId: 'seer',
      targetId: 'wolf',
    })
    expect(nextBotCommands(state)).toEqual([{ type: 'CONFIRM_STEP' }])
  })

  it('phát CONFIRM_NIGHT_RESOLUTION khi queue đêm đã xong', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state = submit(state, {
      type: 'SEER_INSPECT',
      actorId: 'seer',
      targetId: 'wolf',
    })
    const confirmed = executeCommand(state, { type: 'CONFIRM_STEP' })
    if (!confirmed.ok) throw new Error(confirmed.error.message)
    state = submit(confirmed.value.state, {
      type: 'WEREWOLF_ATTACK',
      actorId: 'wolf',
      targetId: 'v1',
    })
    const lastConfirm = executeCommand(state, { type: 'CONFIRM_STEP' })
    if (!lastConfirm.ok) throw new Error(lastConfirm.error.message)
    state = lastConfirm.value.state
    // Mọi step đã COMPLETED → advanceNight chuẩn bị resolution.
    expect(state.phase).toBe('NIGHT_RESOLUTION')
    expect(nextBotCommands(state)).toEqual([
      { type: 'CONFIRM_NIGHT_RESOLUTION' },
    ])
  })

  it('không phát gì ở DAY (chờ consent START_VOTE ở T4) và GAME_OVER', () => {
    const day = createFirstNightState(FIVE_PLAYERS)
    day.phase = 'DAY'
    expect(nextBotCommands(day)).toEqual([])

    const over = createFirstNightState(FIVE_PLAYERS)
    over.winner = 'VILLAGE'
    expect(nextBotCommands(over)).toEqual([])
  })
})

describe('runBotLoop', () => {
  it('đêm 5 người: hai lần submit của player + bot loop đưa ván tới DAY', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state = submit(state, {
      type: 'SEER_INSPECT',
      actorId: 'seer',
      targetId: 'wolf',
    })

    const firstLoop = runBotLoop(state)
    expect(firstLoop.ok).toBe(true)
    if (!firstLoop.ok) return
    state = firstLoop.state
    expect(firstLoop.steps.map((step) => step.command.type)).toEqual([
      'CONFIRM_STEP',
    ])
    expect(state.phase).toBe('NIGHT')

    state = submit(state, {
      type: 'WEREWOLF_ATTACK',
      actorId: 'wolf',
      targetId: 'v1',
    })

    const secondLoop = runBotLoop(state)
    expect(secondLoop.ok).toBe(true)
    if (!secondLoop.ok) return
    state = secondLoop.state
    // Confirm wolf attack xong queue cạn → chuẩn bị resolution → confirm luôn.
    expect(secondLoop.steps.map((step) => step.command.type)).toEqual([
      'CONFIRM_STEP',
      'CONFIRM_NIGHT_RESOLUTION',
    ])
    expect(state.phase).toBe('DAY')
    expect(state.players.find((player) => player.id === 'v1')?.alive).toBe(
      false,
    )
    expect(
      secondLoop.events.some(
        (event) => event.type === 'NIGHT_ACTION_CONFIRMED',
      ),
    ).toBe(true)
    expect(
      secondLoop.events.some(
        (event) => event.type === 'NIGHT_RESOLUTION_PREPARED',
      ),
    ).toBe(true)
    expect(nextBotCommands(state)).toEqual([])
  })

  it('R21: majority consent + đủ mốc thời gian → bot START_VOTE', () => {
    const state = createFirstNightState(FIVE_PLAYERS)
    // Đi thẳng tới DAY: mô phỏng đêm đã resolve xong.
    state.phase = 'DAY'
    state.voteConsentIds = []
    state.discussionMinEndsAt = '2026-08-08T00:00:30.000Z'

    // 2/5 consent (thiếu majority 3): bot đứng im dù đã quá mốc.
    state.voteConsentIds = ['wolf', 'seer']
    const clockLate = { now: new Date('2026-08-08T00:01:00.000Z') }
    expect(nextBotCommands(state, clockLate)).toEqual([])

    // Đủ majority nhưng chưa qua mốc 30s: bot vẫn chờ.
    state.voteConsentIds = ['wolf', 'seer', 'v1']
    const clockEarly = { now: new Date('2026-08-08T00:00:29.000Z') }
    expect(nextBotCommands(state, clockEarly)).toEqual([])

    // Đủ majority + quá mốc: mở vote.
    expect(nextBotCommands(state, clockLate)).toEqual([{ type: 'START_VOTE' }])
    const bot = runBotLoop(state, clockLate)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    expect(bot.steps.map((step) => step.command.type)).toEqual(['START_VOTE'])
    expect(bot.state.phase).toBe('VOTE')
    // Sang VOTE: mốc thảo luận của ngày đã hết giá trị.
    expect(bot.state.discussionMinEndsAt).toBeNull()
  })

  it('R21: một người không consent không kẹt ván (majority tính trên người sống)', () => {
    const state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'
    state.discussionMinEndsAt = null
    // 4/5 consent — thiếu v3 vẫn đủ majority 3.
    state.voteConsentIds = ['wolf', 'seer', 'v1', 'v2']
    expect(nextBotCommands(state, { now: new Date() })).toEqual([
      { type: 'START_VOTE' },
    ])
  })

  it('R21: consent trùng lặp và consent của người chết bị từ chối', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'

    const consent = executeCommand(state, {
      type: 'SUBMIT_VOTE_CONSENT',
      actorId: 'seer',
    })
    if (!consent.ok) throw new Error(consent.error.message)
    state = consent.value.state

    const duplicate = executeCommand(state, {
      type: 'SUBMIT_VOTE_CONSENT',
      actorId: 'seer',
    })
    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: 'INVALID_ACTION' },
    })
  })

  it('vote hòa attempt 1: bot confirm xong quay lại VOTE attempt 2, không SKIP_REVOTE', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'

    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    state = start.value.state

    const tied = executeCommand(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: true,
      selectedPlayerId: null,
    })
    if (!tied.ok) throw new Error(tied.error.message)
    state = tied.value.state

    const bot = runBotLoop(state)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    expect(bot.steps.map((step) => step.command.type)).toEqual([
      'CONFIRM_VOTE_RESULT',
    ])
    expect(bot.state.phase).toBe('VOTE')
    expect(bot.state.voteAttempt).toBe(2)
    expect(nextBotCommands(bot.state)).toEqual([])
  })

  it('R20: đủ phiếu thì bot tally — đa số rõ → loại, hòa → revote với phiếu mới', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'

    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    state = start.value.state
    expect(nextBotCommands(state)).toEqual([])

    // 5 phiếu: v1 được 3, wolf được 2 → v1 bị loại.
    const votes: Array<[string, string | null]> = [
      ['wolf', 'v1'],
      ['seer', 'v1'],
      ['v2', 'wolf'],
      ['v3', 'wolf'],
      ['v1', 'v1'],
    ]
    for (const [actorId, targetId] of votes) {
      const cast = executeCommand(state, {
        type: 'SUBMIT_VOTE',
        actorId,
        targetId,
      })
      if (!cast.ok) throw new Error(cast.error.message)
      state = cast.value.state
    }

    // Chưa đủ phiếu thì bot đứng im; phiếu cuối cùng kích hoạt tally.
    expect(nextBotCommands(state)).toEqual([
      { type: 'SUBMIT_VOTE_RESULT', tied: false, selectedPlayerId: 'v1' },
    ])
    const bot = runBotLoop(state)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    expect(bot.steps.map((step) => step.command.type)).toEqual([
      'SUBMIT_VOTE_RESULT',
      'CONFIRM_VOTE_RESULT',
    ])
    expect(bot.state.phase).toBe('NIGHT')
    expect(bot.state.players.find((player) => player.id === 'v1')?.alive).toBe(
      false,
    )
    // Đêm mới: phiếu attempt cũ phải được reset.
    expect(bot.state.voteSubmissions).toEqual({})
  })

  it('R20: hòa phiếu qua thiết bị — attempt 2 tiếp tục hòa thì không ai bị loại', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'
    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    state = start.value.state

    // Attempt 1: 2-2-1 hòa.
    const attempt1: Array<[string, string | null]> = [
      ['wolf', 'v1'],
      ['seer', 'v1'],
      ['v1', 'v2'],
      ['v2', 'v2'],
      ['v3', null],
    ]
    for (const [actorId, targetId] of attempt1) {
      const cast = executeCommand(state, {
        type: 'SUBMIT_VOTE',
        actorId,
        targetId,
      })
      if (!cast.ok) throw new Error(cast.error.message)
      state = cast.value.state
    }
    const bot1 = runBotLoop(state)
    if (!bot1.ok) throw new Error(bot1.error.message)
    state = bot1.state
    expect(state.phase).toBe('VOTE')
    expect(state.voteAttempt).toBe(2)

    // Attempt 2: lại hòa 2-2 → không ai bị loại, sang đêm.
    const attempt2: Array<[string, string | null]> = [
      ['wolf', 'v1'],
      ['seer', 'v1'],
      ['v1', 'v2'],
      ['v2', 'v2'],
      ['v3', 'wolf'],
    ]
    for (const [actorId, targetId] of attempt2) {
      const cast = executeCommand(state, {
        type: 'SUBMIT_VOTE',
        actorId,
        targetId,
      })
      if (!cast.ok) throw new Error(cast.error.message)
      state = cast.value.state
    }
    const bot2 = runBotLoop(state)
    if (!bot2.ok) throw new Error(bot2.error.message)
    expect(bot2.state.phase).toBe('NIGHT')
    expect(bot2.state.round).toBe(2)
    expect(bot2.state.players.every((player) => player.alive)).toBe(true)
  })

  it('R20: phiếu trắng khi cả bàn trắng → hòa; không ai vote hai lần trong một attempt', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'DAY'
    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    state = start.value.state

    for (const actorId of ['wolf', 'seer', 'v1', 'v2', 'v3']) {
      const cast = executeCommand(state, {
        type: 'SUBMIT_VOTE',
        actorId,
        targetId: null,
      })
      if (!cast.ok) throw new Error(cast.error.message)
      state = cast.value.state
    }
    expect(nextBotCommands(state)).toEqual([
      { type: 'SUBMIT_VOTE_RESULT', tied: true, selectedPlayerId: null },
    ])

    const duplicate = executeCommand(state, {
      type: 'SUBMIT_VOTE',
      actorId: 'wolf',
      targetId: 'v1',
    })
    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: 'INVALID_ACTION' },
    })
  })

  it('loại Hunter: bot không làm gì khi hunter chưa bắn, xác nhận ngay sau khi bắn', () => {
    // 6 người: wolf + hunter + 4 villager (orchestrator không validate composition).
    const players: Player[] = [
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'hunter', role: 'HUNTER', alive: true, abilityState: null },
      villager('v1'),
      villager('v2'),
      villager('v3'),
      villager('v4'),
    ]
    let state = createFirstNightState(players)
    state = submit(state, {
      type: 'HUNTER_MARK',
      actorId: 'hunter',
      targetId: 'v2',
    })
    const markBot = runBotLoop(state)
    expect(markBot.ok).toBe(true)
    if (!markBot.ok) return
    state = submit(markBot.state, {
      type: 'WEREWOLF_ATTACK',
      actorId: 'wolf',
      targetId: 'v1',
    })

    const nightBot = runBotLoop(state)
    expect(nightBot.ok).toBe(true)
    if (!nightBot.ok) return
    state = nightBot.state
    expect(state.phase).toBe('DAY')

    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    const voted = executeCommand(start.value.state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'hunter',
    })
    if (!voted.ok) throw new Error(voted.error.message)

    const voteBot = runBotLoop(voted.value.state)
    expect(voteBot.ok).toBe(true)
    if (!voteBot.ok) return
    state = voteBot.state
    // Hunter bị loại → HUNTER_SHOT chờ hunter bắn; bot không thay hunter bắn.
    expect(state.phase).toBe('HUNTER_SHOT')
    expect(state.pendingHunterShot).toEqual({
      hunterId: 'hunter',
      targetId: null,
    })
    expect(nextBotCommands(state)).toEqual([])

    const shot = executeCommand(state, {
      type: 'SUBMIT_HUNTER_SHOT',
      actorId: 'hunter',
      targetId: 'v3',
    })
    if (!shot.ok) throw new Error(shot.error.message)

    const shotBot = runBotLoop(shot.value.state)
    expect(shotBot.ok).toBe(true)
    if (!shotBot.ok) return
    expect(shotBot.steps.map((step) => step.command.type)).toEqual([
      'CONFIRM_HUNTER_SHOT',
    ])
    expect(shotBot.state.phase).toBe('NIGHT')
    expect(shotBot.state.round).toBe(2)
  })

  it('vote loại xong đạt điều kiện thắng: bot dừng ở GAME_OVER', () => {
    // 1 wolf + 3 villagers: đêm ăn 1, ngày loại 1 → còn 1 dân, wolf thắng (R03).
    const players: Player[] = [
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      villager('v1'),
      villager('v2'),
      villager('v3'),
    ]
    let state = createFirstNightState(players)
    state = submit(state, {
      type: 'WEREWOLF_ATTACK',
      actorId: 'wolf',
      targetId: 'v1',
    })
    const bot = runBotLoop(state)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    state = bot.state
    expect(state.phase).toBe('DAY')

    const start = executeCommand(state, { type: 'START_VOTE' })
    if (!start.ok) throw new Error(start.error.message)
    const voted = executeCommand(start.value.state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'v2',
    })
    if (!voted.ok) throw new Error(voted.error.message)

    const finalBot = runBotLoop(voted.value.state)
    expect(finalBot.ok).toBe(true)
    if (!finalBot.ok) return
    expect(finalBot.state.phase).toBe('GAME_OVER')
    expect(finalBot.state.winner).toBe('WEREWOLF')
    expect(nextBotCommands(finalBot.state)).toEqual([])
  })
})

describe('R22 timeout (bot + clock)', () => {
  function nightWithDeadline(): GameState {
    const state = createFirstNightState(FIVE_PLAYERS)
    // Mô phỏng store đã gắn mốc cho step ACTIVE (SEER_INSPECT).
    state.waitingKey = 'STEP:1:SEER_INSPECT'
    state.waitingDeadlineAt = '2026-08-08T00:00:45.000Z'
    return state
  }

  it('step đêm hết giờ → SKIP_STEP, step kế được gắn mốc mới', () => {
    let state = nightWithDeadline()
    const clock = { now: new Date('2026-08-08T00:00:46.000Z') }

    expect(nextBotCommands(state, clock)).toEqual([
      { type: 'SKIP_STEP', reason: 'TIMEOUT' },
    ])
    const bot = runBotLoop(state, clock)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    state = bot.state
    // Seer bị skip, bước kế (Werewolf Attack) ACTIVE với mốc mới chưa hết hạn.
    const seerStep = state.queue.find((item) => item.step === 'SEER_INSPECT')
    expect(seerStep?.status).toBe('SKIPPED')
    expect(seerStep?.skipReason).toBe('TIMEOUT')
    expect(state.waitingKey).toBe('STEP:1:WEREWOLF_ATTACK')
    expect(Date.parse(state.waitingDeadlineAt ?? '')).toBeGreaterThan(
      clock.now.getTime(),
    )
    // Loop dừng — không ăn theo skip nốt step Wolf.
    expect(bot.steps).toHaveLength(1)
    expect(nextBotCommands(state, clock)).toEqual([])
  })

  it('chưa hết giờ thì bot không skip', () => {
    const state = nightWithDeadline()
    const clock = { now: new Date('2026-08-08T00:00:44.000Z') }
    expect(nextBotCommands(state, clock)).toEqual([])
  })

  it('vote hết giờ: phiếu thiếu tính trắng — hòa thì theo R14', () => {
    let state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'VOTE'
    state.waitingKey = 'VOTE:1:1'
    state.waitingDeadlineAt = '2026-08-08T00:01:00.000Z'
    const clock = { now: new Date('2026-08-08T00:01:01.000Z') }

    // 2 phiếu dàn 1-1 (wolf→v1, seer→v2), 3 người AFK trắng → hòa attempt 1.
    const splitVotes: Array<[string, string | null]> = [
      ['wolf', 'v1'],
      ['seer', 'v2'],
    ]
    for (const [actorId, targetId] of splitVotes) {
      const cast = executeCommand(state, {
        type: 'SUBMIT_VOTE',
        actorId,
        targetId,
      })
      if (!cast.ok) throw new Error(cast.error.message)
      state = cast.value.state
    }

    expect(nextBotCommands(state, clock)).toEqual([
      { type: 'SUBMIT_VOTE_RESULT', tied: true, selectedPlayerId: null },
    ])
    const bot = runBotLoop(state, clock)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    // Hòa attempt 1 → revote; attempt 2 có mốc mới.
    expect(bot.state.phase).toBe('VOTE')
    expect(bot.state.voteAttempt).toBe(2)
    expect(bot.state.waitingKey).toBe('VOTE:1:2')
    expect(Date.parse(bot.state.waitingDeadlineAt ?? '')).toBeGreaterThan(
      clock.now.getTime(),
    )
  })

  it('hunter không bắn đúng hạn → SKIP_HUNTER_SHOT, sang đêm mới', () => {
    const state = createFirstNightState(FIVE_PLAYERS)
    state.phase = 'HUNTER_SHOT'
    state.pendingHunterShot = { hunterId: 'seer', targetId: null }
    state.waitingKey = 'SHOT:1'
    state.waitingDeadlineAt = '2026-08-08T00:01:00.000Z'
    // Ván 4 người: 1 wolf + 3 dân, hunter chết vì vote... dùng state mô phỏng:
    // wolf + 2 dân sống, hunter đã chết (đang pending shot).
    state.players = [
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'seer', role: 'HUNTER', alive: false, abilityState: null },
      { id: 'v1', role: 'VILLAGER', alive: true, abilityState: null },
      { id: 'v2', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    const clock = { now: new Date('2026-08-08T00:01:01.000Z') }

    expect(nextBotCommands(state, clock)).toEqual([
      { type: 'SKIP_HUNTER_SHOT' },
    ])
    const bot = runBotLoop(state, clock)
    expect(bot.ok).toBe(true)
    if (!bot.ok) return
    expect(bot.state.phase).toBe('NIGHT')
    expect(bot.state.pendingHunterShot).toBeNull()
    expect(bot.state.round).toBe(2)
  })
})
