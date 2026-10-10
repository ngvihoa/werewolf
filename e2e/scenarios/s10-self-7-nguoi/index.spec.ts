import type { Locator, Page } from '@playwright/test'
import type { TablePlayer } from '../../fixtures/table'

import { expect, test } from '@playwright/test'

import { reloadUntilVisible } from '../../fixtures/scenario'
import {
  selfParticipants,
  createSelfTable,
  startSelfTable,
} from '../../fixtures/table'

// S10 — Ván SELF 7 người: bot quản trò điều phối, cả bàn tự hành động trên
// thiết bị (kịch bản đầy đủ: e2e/scenarios/s10-self-7-nguoi/scenario.md).
// Đêm 1: bảo vệ + tiên tri + Sói cắn + Phù thủy cứu → không ai chết; ngày 1
// consent mở biểu quyết, vote loại Sói 1; đêm 2 độc Sói 2 → làng thắng →
// chủ phòng chơi ván mới cùng phòng.

test('SELF 7 người: cứu, consent, vote bot, độc Sói — làng thắng và chơi lại', async ({
  browser,
}) => {
  test.setTimeout(480_000)
  const table = await createSelfTable(browser, 7)

  try {
    await startSelfTable(table)
    const participants = selfParticipants(table)

    // Đọc vai từng người đúng MỘT lượt (mở dialog "Xem vai trò").
    const byRole = new Map<string, TablePlayer[]>()
    for (const player of participants) {
      const role = await readSelfRole(player.page)
      byRole.set(role, [...(byRole.get(role) ?? []), player])
    }
    const wolves = byRole.get('Ma sói') ?? []
    const villagers = byRole.get('Dân làng') ?? []
    const seer = byRole.get('Tiên tri')?.[0]
    const witch = byRole.get('Phù thủy')?.[0]
    const protector = byRole.get('Bảo vệ')?.[0]
    const wolf1 = wolves[0]
    const wolf2 = wolves[1]
    const villager1 = villagers[0]
    if (
      !seer ||
      !witch ||
      !protector ||
      !wolf1 ||
      !wolf2 ||
      !villager1 ||
      wolves.length !== 2 ||
      villagers.length !== 2
    ) {
      throw new Error(
        `Composition mismatch: ${JSON.stringify([...byRole.entries()])}`,
      )
    }

    // ===== Đêm 1: bảo hộ, soi, cắn, cứu — bot tự xác nhận từng bước =====
    await selfNightAction(protector, { targetName: seer.name })
    await selfNightAction(seer, { targetName: wolf1.name })
    await selfNightAction(wolf1, { targetName: villager1.name })
    await selfWitchAction(witch, { heal: true })

    // Bình minh: bot mở ngày, không ai chết (dân V1 được cứu).
    const consentButton = (page: Page) =>
      page.getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
    await reloadUntilVisible(seer.page, () => consentButton(seer.page), 60_000)

    // Sổ tay riêng: Lịch sử soi ghi MA SÓI cho Ma sói 1 (dòng chạm-mới-hiện).
    await seer.page.getByRole('button', { name: 'Lịch sử soi' }).click()
    await seer.page
      .getByRole('button', {
        name: new RegExp(`Lần soi \\d+ · ${wolf1.name}`),
      })
      .first()
      .click()
    await expect(seer.page.getByText('MA SÓI').first()).toBeVisible()

    // ===== Ngày 1: consent đủ majority → bot mở biểu quyết =====
    for (const player of participants) {
      await consentAndVerify(player)
    }
    const ballot = (page: Page) =>
      page.getByRole('button', { name: 'Bỏ phiếu', exact: true })
    await reloadUntilVisible(wolf1.page, () => ballot(wolf1.page), 90_000)

    // 5 phe làng vote Sói 1; 2 Sói vote Tiên tri. Lá cuối tự tổng kết + bot
    // công bố → về Đêm 02.
    for (const voter of [seer, witch, protector, villager1, wolf1]) {
      await selfVote(voter, wolf1.name)
    }
    await selfVoteLast(wolf2, seer.name)

    // ===== Đêm 2: bảo hộ người khác, soi Sói 2, cắn, độc =====
    await selfNightAction(protector, { targetName: villager2Name(byRole) })
    await selfNightAction(seer, { targetName: wolf2.name })
    await selfNightAction(wolf2, { targetName: villager1.name })
    await selfWitchAction(witch, { poisonTargetName: wolf2.name })

    // Bình minh định đoạt: Dân V1 + Ma sói 2 chết → phe Sói rỗng → làng thắng.
    const host = table.host
    await reloadUntilVisible(
      host.page,
      () => host.page.getByText('Phe Dân làng chiến thắng'),
      60_000,
    )
    await expect(host.page.getByText('Sự thật được lộ ra')).toBeVisible()

    // ===== Chơi ván mới cùng phòng =====
    // SELF rematch: khối xác nhận INLINE (không phải <dialog> như MODERATED).
    const rematch = host.page.getByRole('button', {
      name: 'Chơi ván mới cùng phòng',
    })
    await rematch.click()
    const confirmRematch = host.page.getByRole('button', {
      name: 'Xác nhận chơi ván mới',
    })
    await expect(confirmRematch).toBeVisible()
    await tap(host.page, confirmRematch)
    await expect(
      host.page.getByRole('button', { name: 'Xáo và phân vai' }),
    ).toBeVisible({ timeout: 45_000 })
  } finally {
    await table.close()
  }
})

// ==== Helpers SELF (chỉ dùng trong spec này) ====

// Trang người chơi cũng refetch chập chờn ở headless — click qua
// dispatchEvent (re-resolve element tươi) kèm giới hạn 5s.
async function tap(_page: Page, locator: Locator): Promise<void> {
  await Promise.race([
    locator.dispatchEvent('click').catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ])
}

const SELF_ROLE_LABELS = [
  'Ma sói',
  'Sói Đầu Đàn',
  'Sói Trắng',
  'Sói Lai',
  'Tiên tri',
  'Phù thủy',
  'Bảo vệ',
  'Thợ săn',
  'Già làng',
  'Thằng ngốc',
  'Người thổi sáo',
  'Thần tình yêu',
  'Kỹ nữ',
  'Dân làng',
]

// Đọc vai qua dialog "Xem vai trò" trên /game.
async function readSelfRole(page: Page): Promise<string> {
  const open = page.getByRole('button', { name: /Xem vai trò/ })
  await expect(open).toBeVisible()
  await open.click()
  const dialog = page.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  const lines = (await dialog.innerText()).split('\n').map((l) => l.trim())
  const role =
    SELF_ROLE_LABELS.find((label) => lines.includes(label)) ?? 'không rõ'
  await page.getByRole('button', { name: 'Đóng thẻ vai' }).click()
  await expect(dialog).toBeHidden()
  return role
}

// Submit hành động đêm trên thiết bị của chính mình (form vừa reload nên
// version tươi). Form NIGHT hiện theo lượt — reload-poll trước khi bấm.
async function selfNightAction(
  player: TablePlayer,
  options: { targetName?: string },
): Promise<void> {
  const submit = player.page.getByRole('button', { name: 'Gửi hành động' })
  await reloadUntilVisible(player.page, () => submit, 60_000)
  if (options.targetName) {
    await tap(
      player.page,
      player.page.getByRole('button', {
        name: options.targetName,
        exact: true,
      }),
    )
  }
  await tap(player.page, submit)
  await expect(submit).toBeHidden()
}

// Form Phù thủy ở SELF: checkbox bình cứu + group "Chọn người đầu độc".
async function selfWitchAction(
  player: TablePlayer,
  options: { heal?: boolean; poisonTargetName?: string },
): Promise<void> {
  const submit = player.page.getByRole('button', { name: 'Gửi hành động' })
  await reloadUntilVisible(player.page, () => submit, 60_000)
  if (options.heal) {
    await tap(
      player.page,
      player.page.getByRole('checkbox', { name: 'Dùng bình cứu' }),
    )
  }
  if (options.poisonTargetName) {
    const group = player.page.getByRole('group', {
      name: 'Chọn người đầu độc',
    })
    await tap(
      player.page,
      group.getByRole('button', {
        name: options.poisonTargetName,
        exact: true,
      }),
    )
  }
  await tap(player.page, submit)
  await expect(submit).toBeHidden()
}

// Consent kèm xác minh (R21) — STALE có thể đánh rơi lần bấm đầu, vòng lặp
// reload và bấm lại (consent idempotent theo hasConsented).
async function consentAndVerify(player: TablePlayer): Promise<void> {
  const ready = player.page.getByText('Bạn đã sẵn sàng').first()
  const ballotOpen = player.page
    .getByRole('button', { name: 'Bỏ phiếu', exact: true })
    .first()
  const button = player.page
    .getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
    .first()
  await expect(async () => {
    await player.page.reload()
    await expect(ready.or(ballotOpen).or(button)).toBeVisible({
      timeout: 15_000,
    })
    if (await ready.isVisible().catch(() => false)) return
    if (await ballotOpen.isVisible().catch(() => false)) return
    await tap(player.page, button)
    await expect(ready.or(ballotOpen)).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 120_000 })
}

// Bỏ phiếu trên thiết bị (SELF: nút "Bỏ phiếu") kèm xác minh "Đã ghi phiếu".
async function selfVote(
  player: TablePlayer,
  targetName: string,
): Promise<void> {
  const ballot = player.page
    .getByRole('button', { name: 'Bỏ phiếu', exact: true })
    .first()
  await reloadUntilVisible(player.page, () => ballot, 60_000)
  await tap(
    player.page,
    player.page.getByRole('button', { name: targetName, exact: true }),
  )
  await tap(player.page, ballot)
  await expect(
    player.page.getByText('Đã ghi phiếu của bạn').first(),
  ).toBeVisible({ timeout: 10_000 })
}

// Lá phiếu CUỐI: bot tally + công bố trong cùng request — chấp nhận cả
// trạng thái trang nhảy thẳng sang đêm mới/bị loại.
async function selfVoteLast(
  player: TablePlayer,
  targetName: string,
): Promise<void> {
  const ballot = player.page
    .getByRole('button', { name: 'Bỏ phiếu', exact: true })
    .first()
  await reloadUntilVisible(player.page, () => ballot, 60_000)
  await tap(
    player.page,
    player.page.getByRole('button', { name: targetName, exact: true }),
  )
  await tap(player.page, ballot)
  await expect(
    player.page
      .getByText('Đã ghi phiếu của bạn')
      .or(player.page.getByText('Giữ im lặng và chờ lượt'))
      .or(player.page.getByText('Bạn đã bị loại'))
      .first(),
  ).toBeVisible({ timeout: 15_000 })
}

function villager2Name(byRole: Map<string, TablePlayer[]>): string {
  const villagers = byRole.get('Dân làng') ?? []
  const second = villagers[1]
  if (!second) throw new Error('Second villager is missing')
  return second.name
}
