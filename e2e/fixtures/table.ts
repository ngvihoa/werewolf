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
      await expect(player.page.getByText('Đang chờ Quản trò')).toBeVisible()
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
  await expect(table.moderator.page).toHaveURL(/\/game$/)
  await Promise.all(
    table.players.map(({ page }) => expect(page).toHaveURL(/\/game$/)),
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
      await expect(player.page.getByText('Đang chờ chủ phòng')).toBeVisible()
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
