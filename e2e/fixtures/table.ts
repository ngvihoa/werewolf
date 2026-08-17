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
): Promise<TestTable> {
  if (playerCount < 5 || playerCount > 12) {
    throw new Error('A table requires 5-12 players')
  }

  const moderator = await openParticipant(browser, 'Moderator')
  await moderator.page.goto('/')
  await moderator.page.waitForLoadState('networkidle')
  await moderator.page.getByLabel('Tên Quản trò').fill(moderator.name)
  await moderator.page.getByRole('button', { name: 'Tạo phòng local' }).click()

  const roomHeading = moderator.page.getByRole('heading', { name: /Phòng/ })
  await expect(roomHeading).toBeVisible()
  const heading = await roomHeading.textContent()
  const roomCode = heading?.match(/[A-Z0-9]{6}/)?.[0]
  if (!roomCode) throw new Error(`Could not read room code from "${heading}"`)

  const players = await Promise.all(
    Array.from({ length: playerCount }, async (_, index) => {
      const player = await openParticipant(browser, `Player ${index + 1}`)
      await player.page.goto('/')
      await player.page.waitForLoadState('networkidle')
      await player.page.getByRole('button', { name: 'Tham gia' }).click()
      await player.page.getByLabel('Room code').fill(roomCode)
      await player.page.getByLabel('Tên hiển thị').fill(player.name)
      await player.page.getByRole('button', { name: 'Vào phòng' }).click()
      await expect(player.page.getByText('Đang chờ Quản trò')).toBeVisible()
      return player
    }),
  )

  await expect(moderator.page.getByText(`${playerCount} / 12`)).toBeVisible()

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
    await player.page.getByRole('button', { name: 'Xem thẻ vai' }).click()
    const matches = await player.page
      .getByText(roleName, { exact: true })
      .count()
    await player.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()
    if (matches > 0) return player
  }
  throw new Error(`No player was assigned role "${roleName}"`)
}

async function openParticipant(
  browser: Browser,
  name: string,
): Promise<TablePlayer> {
  const context = await browser.newContext()
  return { context, name, page: await context.newPage() }
}
