import type { Browser, BrowserContext, Page } from '@playwright/test'

import { expect } from '@playwright/test'

export type TablePlayer = {
  context: BrowserContext
  name: string
  page: Page
}

export type TestTable = {
  moderator: TablePlayer
  players: TablePlayer[]
  roomCode: string
  close: () => Promise<void>
}

export async function createTable(
  browser: Browser,
  playerCount = 8,
  names: {
    moderatorName?: string
    playerNames?: string[]
    contextOptions?: Parameters<Browser['newContext']>[0]
  } = {},
): Promise<TestTable> {
  if (playerCount < 5 || playerCount > 15) {
    throw new Error('A table requires 5-15 players')
  }

  const moderator = await openParticipant(
    browser,
    names.moderatorName ?? 'Moderator',
    names.contextOptions,
  )
  await moderator.page.goto('/play')
  await moderator.page.waitForLoadState('networkidle')
  // Neo đầu chuỗi: 'Quản trò' trơn giờ trúng cả nút "Không quản trò" của SELF.
  await moderator.page.getByRole('button', { name: /^Quản trò/ }).click()
  await moderator.page.getByLabel('Tên của bạn').fill(moderator.name)
  await moderator.page.getByRole('button', { name: 'Mở phòng mới' }).click()

  const roomHeading = moderator.page.getByRole('heading', { name: /Phòng/ })
  await expect(roomHeading).toBeVisible()
  const heading = await roomHeading.textContent()
  const roomCode = heading?.match(/[A-Z0-9]{6}/)?.[0]
  if (!roomCode) throw new Error(`Could not read room code from "${heading}"`)

  const players = await Promise.all(
    Array.from({ length: playerCount }, async (_, index) => {
      const player = await openParticipant(
        browser,
        names.playerNames?.[index] ?? `Player ${index + 1}`,
        names.contextOptions,
      )
      await player.page.goto('/play')
      await player.page.waitForLoadState('networkidle')
      await player.page.getByRole('button', { name: 'Người chơi' }).click()
      await player.page.getByLabel('Mã phòng').fill(roomCode)
      await player.page.getByLabel('Tên hiển thị').fill(player.name)
      await player.page.getByRole('button', { name: 'Vào phòng' }).click()
      // Chờ THỤ ĐỘNG mutation join + refetch — can thiệp sớm (reload/goto)
      // ngắt mutation, còn retry join cùng tên bị chặn "Display name is
      // already in use" (lần đầu đã commit server-side dù response mất) —
      // nên KHÔNG retry được, chỉ chờ đủ dài rồi fail rõ nếu treo.
      await expect(player.page.getByText('Đang chờ Quản trò')).toBeVisible({
        timeout: 30_000,
      })
      return player
    }),
  )

  await expect(moderator.page.getByText(`${playerCount} / 15`)).toBeVisible()

  return {
    moderator,
    players,
    roomCode,
    close: async () => {
      await Promise.all([
        moderator.context.close(),
        ...players.map((player) => player.context.close()),
      ])
    },
  }
}

export async function startTable(table: TestTable): Promise<void> {
  await table.moderator.page
    .getByRole('button', { name: 'Xáo và phân vai' })
    .click()
  await expect(
    table.moderator.page.getByRole('button', { name: 'Xáo và phân lại vai' }),
  ).toBeVisible()

  for (const { page } of table.players) {
    const ready = page.getByRole('button', {
      name: 'Tôi đã xem vai và sẵn sàng',
    })
    await expect(ready).toBeVisible()
    await ready.click()
    await expect(
      page.getByRole('button', { name: 'Hủy sẵn sàng' }),
    ).toBeVisible()
  }

  const start = table.moderator.page.getByRole('button', {
    name: 'Bắt đầu đêm đầu tiên',
  })
  await expect(start).toBeEnabled()
  await start.click()
  // Revamp MODERATED (M11): quản trò ở /game, người chơi MODERATED được đá
  // sang trang riêng /table.
  await expect(table.moderator.page).toHaveURL(/\/game$/)
  await Promise.all(
    table.players.map(({ page }) => expect(page).toHaveURL(/\/table$/)),
  )
}

export async function findPlayerByRole(
  players: TablePlayer[],
  roleName: string,
): Promise<TablePlayer> {
  for (const player of players) {
    // Sảnh chờ: thẻ lật tại chỗ. Trong ván: vai nằm sau dialog "Xem vai trò".
    const flip = player.page.getByRole('button', { name: 'Xem thẻ vai' })
    if ((await flip.count()) > 0) {
      await flip.click()
      const matches = await player.page
        .getByText(roleName, { exact: true })
        .count()
      await player.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()
      if (matches > 0) return player
      continue
    }

    const open = player.page.getByRole('button', { name: /Xem vai trò/ })
    await expect(open).toBeVisible()
    await open.click()
    const dialog = player.page.locator('dialog[open]')
    await expect(dialog).toBeVisible()
    const matches = await dialog.getByText(roleName, { exact: true }).count()
    await player.page.getByRole('button', { name: 'Đóng thẻ vai' }).click()
    if (matches > 0) return player
  }
  throw new Error(`No player was assigned role "${roleName}"`)
}

async function openParticipant(
  browser: Browser,
  name: string,
  contextOptions: Parameters<Browser['newContext']>[0] = {},
): Promise<TablePlayer> {
  const context = await browser.newContext(contextOptions)
  return { context, name, page: await context.newPage() }
}

// ===== SELF (không quản trò, R20–R24) =====

export type SelfTable = {
  host: TablePlayer
  players: TablePlayer[]
  roomCode: string
  close: () => Promise<void>
}

// SELF: người tạo phòng là một player thường kiêm chủ phòng — không có
// session Quản trò. playerCount tính cả host.
export async function createSelfTable(
  browser: Browser,
  playerCount = 5,
  names: { hostName?: string; playerNames?: string[] } = {},
  contextOptions: Parameters<Browser['newContext']>[0] = {},
): Promise<SelfTable> {
  if (playerCount < 5 || playerCount > 15) {
    throw new Error('A table requires 5-15 players')
  }

  const host = await openParticipant(
    browser,
    names.hostName ?? 'Chủ phòng',
    contextOptions,
  )
  await host.page.goto('/play')
  await host.page.waitForLoadState('networkidle')
  await host.page.getByRole('button', { name: /Không quản trò/ }).click()
  await host.page.getByLabel('Tên của bạn').fill(host.name)
  await host.page.getByRole('button', { name: 'Mở phòng tự chơi' }).click()

  const roomHeading = host.page.getByRole('heading', { name: /Phòng/ })
  await expect(roomHeading).toBeVisible()
  const heading = await roomHeading.textContent()
  const roomCode = heading?.match(/[A-Z0-9]{6}/)?.[0]
  if (!roomCode) throw new Error(`Could not read room code from "${heading}"`)

  const players = await Promise.all(
    Array.from({ length: playerCount - 1 }, async (_, index) => {
      const player = await openParticipant(
        browser,
        names.playerNames?.[index] ?? `Player ${index + 1}`,
        contextOptions,
      )
      await player.page.goto('/play')
      await player.page.waitForLoadState('networkidle')
      await player.page.getByRole('button', { name: 'Người chơi' }).click()
      await player.page.getByLabel('Mã phòng').fill(roomCode)
      await player.page.getByLabel('Tên hiển thị').fill(player.name)
      await player.page.getByRole('button', { name: 'Vào phòng' }).click()
      // Như createTable: chờ thụ động 30s, không retry (tên trùng bị chặn).
      await expect(player.page.getByText('Đang chờ chủ phòng')).toBeVisible({
        timeout: 30_000,
      })
      return player
    }),
  )

  await expect(host.page.getByText(`${playerCount} / 15`)).toBeVisible()

  return {
    host,
    players,
    roomCode,
    close: async () => {
      await Promise.all([
        host.context.close(),
        ...players.map((player) => player.context.close()),
      ])
    },
  }
}

export async function startSelfTable(table: SelfTable): Promise<void> {
  await table.host.page.getByRole('button', { name: 'Xáo và phân vai' }).click()
  await expect(
    table.host.page.getByRole('button', { name: 'Xáo và phân lại vai' }),
  ).toBeVisible()

  // Chủ phòng cũng là một player: tự xem vai và sẵn sàng như mọi người (R24).
  for (const { page } of [table.host, ...table.players]) {
    const ready = page.getByRole('button', {
      name: 'Tôi đã xem vai và sẵn sàng',
    })
    await expect(ready).toBeVisible()
    await ready.click()
    await expect(
      page.getByRole('button', { name: 'Hủy sẵn sàng' }),
    ).toBeVisible()
  }

  const start = table.host.page.getByRole('button', {
    name: 'Bắt đầu đêm đầu tiên',
  })
  await expect(start).toBeEnabled()
  await start.click()
  await expect(table.host.page).toHaveURL(/\/game$/)
  await Promise.all(
    table.players.map(({ page }) => expect(page).toHaveURL(/\/game$/)),
  )
}

// Tất cả người tham gia (host + players) — vai có thể rơi vào bất kỳ ai.
export function selfParticipants(table: SelfTable): TablePlayer[] {
  return [table.host, ...table.players]
}

// ===== Revamp MODERATED (proxy input M2, bot auto-confirm M3) =====

// Quản trò chọn giúp chủ role một mục tiêu ngay trên panel của mình. Bot
// auto-confirm trong cùng lệnh nên sau hàm này step đã COMPLETED — step kế
// xuất hiện với nút submit của vai đó. Scope vào <form> để không trúng token
// cùng tên ở lưới roster bên dưới (strict mode).
export async function proxyNightStep(
  moderatorPage: Page,
  options: {
    submitLabel: string
    targetName?: string
    secondTargetName?: string
  },
): Promise<void> {
  const form = moderatorPage.locator('form').filter({
    has: moderatorPage.getByRole('button', {
      name: options.submitLabel,
      exact: true,
    }),
  })
  if (options.targetName) {
    await form
      .getByRole('button', { name: options.targetName, exact: true })
      .click()
  }
  if (options.secondTargetName) {
    await form
      .getByRole('button', { name: options.secondTargetName, exact: true })
      .click()
  }
  const submit = form.getByRole('button', {
    name: options.submitLabel,
    exact: true,
  })
  await submit.click()
  await expect(submit).toBeHidden()
}

// M9: hoàn tác bước đêm cuối qua dialog — bước trở lại ACTIVE, quản trò
// chọn lại được.
export async function undoLastNightStep(moderatorPage: Page): Promise<void> {
  await moderatorPage
    .getByRole('button', { name: 'Hoàn tác bước vừa rồi' })
    .click()
  const dialog = moderatorPage.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Lý do hoàn tác (bắt buộc)').fill('E2E: chọn nhầm')
  await dialog.getByRole('button', { name: 'Hoàn tác', exact: true }).click()
  await expect(dialog).toBeHidden()
  // Form proxy giữ state đã chọn trong React — reload để bước trở lại với
  // picker sạch (như quản trò thật nhìn lại màn).
  await moderatorPage.reload()
}

// M10: đánh dấu người sống bị loại khỏi ván qua dialog override.
export async function overrideMarkDead(
  moderatorPage: Page,
  playerName: string,
): Promise<void> {
  await moderatorPage
    .getByRole('button', { name: 'Đánh dấu người bỏ khỏi ván' })
    .click()
  const dialog = moderatorPage.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: playerName, exact: true }).click()
  await dialog.getByLabel('Lý do (bắt buộc)').fill('E2E: bỏ về giữa ván')
  await dialog
    .getByRole('button', { name: 'Đánh dấu đã chết', exact: true })
    .click()
  await expect(dialog).toBeHidden()
}

// M6: một người chơi bỏ phiếu trên /table — targetName rỗng = phiếu trắng.
export async function castTableVote(
  player: TablePlayer,
  targetName?: string,
): Promise<void> {
  await player.page.reload()
  if (targetName) {
    await player.page
      .getByRole('button', { name: targetName, exact: true })
      .click()
  } else {
    await player.page.getByLabel(/Bỏ phiếu trắng/).check()
  }
  const submit = player.page.getByRole('button', { name: 'Ghi phiếu' })
  await submit.click()
  await expect(player.page.getByText('Đã ghi phiếu của bạn')).toBeVisible({
    timeout: 10_000,
  })
}

// Revamp MODERATED: đọc bảng vai ngay từ god-view roster của Quản trò
// (mỗi token hiện tên + nhãn vai) — thay vì mở dialog từng người chơi
// (findPlayerByRole là O(n) page-ops, đắt trong fixture 8 người). Trả danh
// sách tên theo NHÃN VAI để bắt được role nhóm (8 người có 2 Ma sói).
export async function findRoleOwners(
  moderatorPage: Page,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  const items = moderatorPage.getByRole('listitem')
  const count = await items.count()
  for (let index = 0; index < count; index += 1) {
    const lines = (await items.nth(index).innerText())
      .split('\n')
      .map((line) => line.trim())
    // Cấu trúc roster: dòng 1 = tên, dòng 2 = nhãn vai. Listitem của queue
    // / picker có nhãn khác (vd "Thợ săn chọn mục tiêu", số thứ tự) — không
    // trùng key nhãn vai nên vô hại.
    if (lines.length >= 2 && lines[0] && lines[1]) {
      const owners = map.get(lines[1]) ?? []
      if (!owners.includes(lines[0])) owners.push(lines[0])
      map.set(lines[1], owners)
    }
  }
  return map
}

export function playerByName(table: TestTable, name: string): TablePlayer {
  const player = table.players.find((candidate) => candidate.name === name)
  if (!player) throw new Error(`No player named "${name}"`)
  return player
}
