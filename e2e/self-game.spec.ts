import type { Locator, Page } from '@playwright/test'
import type { TablePlayer } from './fixtures/table'

import { expect, test } from '@playwright/test'

import {
  selfParticipants,
  createSelfTable,
  startSelfTable,
} from './fixtures/table'

// T9 — ván SELF đầy đủ qua UI: mọi xác nhận "Quản trò" do bot lo (R20–R24),
// người chơi chỉ submit hành động/bỏ phiếu trên thiết bị của mình.
// Page nền trong test không refetch đáng tin (polling dừng khi page ẩn,
// realtime chập chờn ở headless) → MỌI tương tác dùng pattern reload-poll:
// reload lấy view mới nhất trước khi bấm, và xác minh kết quả sau khi bấm
// thay vì tin rằng click đầu tiên chắc chắn ghi nhận (STALE_VERSION có thể
// đánh rơi một mutation dù UI đã có retry).

test('SELF full game: join → vai → đêm → ngày → vote → phe Dân làng thắng', async ({
  browser,
}) => {
  test.setTimeout(300_000)
  const table = await createSelfTable(browser, 5)

  try {
    await startSelfTable(table)
    const participants = selfParticipants(table)

    const seer = await findFirstByRole(participants, 'Tiên tri')
    const werewolf = await findFirstByRole(participants, 'Ma sói')
    const villagers = await findAllByRole(participants, 'Dân làng')
    expect(villagers).toHaveLength(3)
    const inspectTarget = villagers[0]
    const attackTarget = villagers[1]
    if (!inspectTarget || !attackTarget) {
      throw new Error('Composition is missing villagers')
    }

    // Đêm 1: Tiên tri soi — bot tự xác nhận, không có thao tác Quản trò nào.
    await submitNightAction(seer, inspectTarget.name)

    // Sói cắn một dân làng — step soi phải tự COMPLETED để lượt Sói tới.
    await reloadUntilVisible(
      werewolf.page,
      () => werewolf.page.getByRole('button', { name: 'Gửi hành động' }),
      30_000,
    )
    await submitNightAction(werewolf, attackTarget.name)

    // Bot confirm bước cuối của đêm rồi mở ngày luôn (R20–R22): consent
    // banner (R21) xuất hiện trên trang từng người chơi.
    const consent = (page: Page) =>
      page.getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
    await reloadUntilVisible(
      werewolf.page,
      () => consent(werewolf.page),
      30_000,
    )
    await reloadUntilVisible(seer.page, () => consent(seer.page), 30_000)

    // Mốc thảo luận tối thiểu hiện cho mọi người (R21/R22).
    await expect(werewolf.page.getByText('Thảo luận tối thiểu')).toBeVisible()

    // Còn sống: mọi người trừ nạn nhân bị cắn bấm consent — xác minh từng
    // người thực sự được ghi nhận ("Bạn đã sẵn sàng") để không có consent
    // nào bị đánh rơi âm thầm.
    const alive = participants.filter(
      (player) => player.name !== attackTarget.name,
    )
    for (const player of alive) {
      await consentAndVerify(player)
    }

    // Vote mở khi countdown thảo luận về 0 — client tick, bot mở biểu quyết
    // (R22). Cả bàn đã consent trước đó nên đây chính là đường auto-tick.
    const ballot = (page: Page) =>
      page.getByRole('button', { name: 'Bỏ phiếu', exact: true })
    await reloadUntilVisible(werewolf.page, () => ballot(werewolf.page), 90_000)

    // Bỏ phiếu trên thiết bị (R20): 3 người còn sống vote Sói, Sói vote
    // Tiên tri. Lá phiếu cuối chạm đủ "mọi người sống đã bỏ" → bot tally.
    for (const voter of alive.filter(
      (player) => player.name !== werewolf.name,
    )) {
      await voteAndVerify(voter, werewolf.name)
    }
    await voteAndVerify(werewolf, seer.name)

    // Sói bị loại → phe Dân làng thắng. Host (dù sống hay chết) thấy màn kết quả.
    await reloadUntilVisible(
      table.host.page,
      () => table.host.page.getByText('Phe Dân làng chiến thắng'),
      45_000,
    )

    // Màn kết quả: host có nút chơi ván mới (T7), người thường thấy trạng
    // thái chờ.
    await expect(
      table.host.page.getByRole('button', {
        name: 'Chơi ván mới cùng phòng',
      }),
    ).toBeVisible()
    const nonHost = table.players[0]
    if (!nonHost) throw new Error('Non-host player is missing')
    await reloadUntilVisible(
      nonHost.page,
      () => nonHost.page.getByText('Chủ phòng sẽ mở ván mới'),
      45_000,
    )
  } finally {
    await table.close()
  }
})

test('SELF AFK: đêm 1 không kẹt — step hết giờ tự skip, ván đi tiếp sang ngày', async ({
  browser,
}) => {
  test.setTimeout(300_000)
  const table = await createSelfTable(browser, 5)

  try {
    await startSelfTable(table)
    const participants = selfParticipants(table)

    const seer = await findFirstByRole(participants, 'Tiên tri')
    const werewolf = await findFirstByRole(participants, 'Ma sói')
    const nonWolf = participants.find((player) => player.name !== werewolf.name)
    if (!nonWolf) throw new Error('Attack target is missing')

    // Countdown ngữ cảnh chờ hiện cho mọi người ngay từ start (R22) —
    // startGame phải gắn mốc cho step đêm đầu tiên.
    await reloadUntilVisible(
      werewolf.page,
      () => werewolf.page.getByText('Thời gian hành động'),
      30_000,
    )

    // Tiên tri AFK: không submit. Hết 45s, client đầu tiên tick → step bị
    // skip (TIMEOUT) → lượt Sói active. Form hành động của Sói xuất hiện
    // chứng tỏ ván không kẹt ở step của người AFK.
    await reloadUntilVisible(
      werewolf.page,
      () => werewolf.page.getByRole('button', { name: 'Gửi hành động' }),
      120_000,
    )
    await submitNightAction(werewolf, nonWolf.name)

    // Đêm kết thúc bình thường → Day prompt + consent banner, kể cả trên
    // trang của người AFK. Banner dựa vào refetch của page nên phải
    // reload-poll thay vì expect trực tiếp.
    const consent = (page: Page) =>
      page.getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
    await reloadUntilVisible(
      werewolf.page,
      () => consent(werewolf.page),
      60_000,
    )
    await reloadUntilVisible(seer.page, () => consent(seer.page), 60_000)
  } finally {
    await table.close()
  }
})

// Polling/realtime của page nền trong test không đáng tin — pattern của spec
// MODERATED: reload nhẹ lặp lại cho tới khi nội dung mong đợi xuất hiện.
async function reloadUntilVisible(
  page: Page,
  locate: () => Locator,
  timeout: number,
): Promise<void> {
  await expect(async () => {
    await page.reload()
    await expect(locate()).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout })
}

// Submit hành động đêm trên trang của chính mình (view vừa reload nên version
// tươi) rồi chờ form chuyển sang trạng thái đã gửi — submit của chính trang
// này refetch đáng tin, không cần reload lại.
async function submitNightAction(
  player: TablePlayer,
  targetName: string,
): Promise<void> {
  await player.page
    .getByRole('button', { name: targetName, exact: true })
    .click()
  await player.page.getByRole('button', { name: 'Gửi hành động' }).click()
  await expect(
    player.page.getByRole('button', { name: 'Gửi hành động' }),
  ).toBeHidden()
}

// Consent kèm xác minh: reload-poll tới khi thấy nút, bấm, rồi phải thấy
// "Bạn đã sẵn sàng" (đã ghi nhận). Nếu STALE làm mất consent, vòng lặp
// reload lại và bấm lại — consent là idempotent theo trạng thái hasConsented.
// Biểu quyết mở sớm (tick qua deadline) cũng coi như consent đã ghi.
// Sau reload phải CHỜ render xong (chờ 1 trong các trạng thái xuất hiện)
// rồi mới rẽ nhánh — probe isVisible() tức thời sẽ đo nhịp trước hydration.
async function consentAndVerify(player: TablePlayer): Promise<void> {
  await expect(async () => {
    await player.page.reload()
    const ready = player.page.getByText('Bạn đã sẵn sàng').first()
    const ballotOpen = player.page
      .getByRole('button', { name: 'Bỏ phiếu', exact: true })
      .first()
    const button = player.page
      .getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
      .first()
    await expect(ready.or(ballotOpen).or(button)).toBeVisible({
      timeout: 15_000,
    })
    if (await ready.isVisible().catch(() => false)) return
    if (await ballotOpen.isVisible().catch(() => false)) return
    await button.click()
    await expect(ready.or(ballotOpen)).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 90_000 })
}

// Bỏ phiếu kèm xác minh: reload-poll tới khi thấy biểu quyết, chọn target,
// bấm, rồi phải thấy "Đã ghi phiếu của bạn" — TRỪ hai trường hợp UI nhảy
// thẳng qua trạng thái khác: phiếu cuối trigger tally trong cùng request
// (GAME_OVER), hoặc bot abstain người chậm ở deadline biểu quyết 60s (R22)
// cũng kết thúc ván. Marker GAME_OVER là "Sự thật được lộ ra" (chỉ màn kết
// quả có) — KHÔNG dùng "Kết thúc ván" vì trùng tên nút kết thúc sớm của chủ
// phòng (R23) trên trang biểu quyết. .first() trên locator gộp để tránh
// strict violation khi nhiều trạng thái cùng match.
async function voteAndVerify(
  voter: TablePlayer,
  targetName: string,
): Promise<void> {
  await expect(async () => {
    await voter.page.reload()
    const done = voter.page.getByText('Đã ghi phiếu của bạn').first()
    const gameOver = voter.page.getByText('Sự thật được lộ ra').first()
    const ballot = voter.page
      .getByRole('button', { name: 'Bỏ phiếu', exact: true })
      .first()
    await expect(done.or(gameOver).or(ballot).first()).toBeVisible({
      timeout: 15_000,
    })
    if (await done.isVisible().catch(() => false)) return
    if (await gameOver.isVisible().catch(() => false)) return
    await voter.page
      .getByRole('button', { name: targetName, exact: true })
      .click()
    await ballot.click()
    await expect(done.or(gameOver).first()).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 90_000 })
}

// Trong ván: vai nằm sau dialog "Xem vai trò" (component RoleCardDialog).
async function hasRole(
  player: TablePlayer,
  roleName: string,
): Promise<boolean> {
  const open = player.page.getByRole('button', { name: /Xem vai trò/ })
  await expect(open).toBeVisible()
  await open.click()
  const dialog = player.page.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  const matched =
    (await dialog.getByText(roleName, { exact: true }).count()) > 0
  await player.page.getByRole('button', { name: 'Đóng thẻ vai' }).click()
  return matched
}

async function findFirstByRole(
  players: TablePlayer[],
  roleName: string,
): Promise<TablePlayer> {
  for (const player of players) {
    if (await hasRole(player, roleName)) return player
  }
  throw new Error(`No player was assigned role "${roleName}"`)
}

async function findAllByRole(
  players: TablePlayer[],
  roleName: string,
): Promise<TablePlayer[]> {
  const matches: TablePlayer[] = []
  for (const player of players) {
    if (await hasRole(player, roleName)) matches.push(player)
  }
  return matches
}
