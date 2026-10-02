import type { TablePlayer } from './fixtures/table'
import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { createTable, findPlayerByRole, startTable } from './fixtures/table'

test('starts an isolated eight-player game', async ({ browser }) => {
  const table = await createTable(browser, 8)

  try {
    await startTable(table)

    await expect(table.moderator.page.getByText('Đêm 01')).toBeVisible()
    const hunter = await findPlayerByRole(table.players, 'Thợ săn')
    await expect(
      hunter.page.getByText('Thông tin trên màn hình này chỉ dành cho bạn.'),
    ).toBeVisible()
  } finally {
    await table.close()
  }
})

test('invite deep link joins with prefilled room code', async ({ browser }) => {
  const table = await createTable(browser, 5)

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`/join/${table.roomCode}`)
    // Chờ hydration xong trước khi fill — fill sớm bị client re-render xóa giá trị.
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Tên hiển thị').fill('Khách mời')
    await page.getByRole('button', { name: 'Vào phòng' }).click()
    await expect(page.getByText('Đang chờ Quản trò')).toBeVisible()
    await expect(table.moderator.page.getByText('6 / 15')).toBeVisible()
    await context.close()
  } finally {
    await table.close()
  }
})

test('moderator can open the invite QR dialog', async ({ browser }) => {
  const table = await createTable(browser, 5)

  try {
    await table.moderator.page
      .getByRole('button', { name: /Mở mã QR mời vào phòng/ })
      .click()
    const dialog = table.moderator.page.locator('dialog[open]')
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('img', {
        name: `Mã QR dẫn đến phòng ${table.roomCode}`,
      }),
    ).toBeVisible()
  } finally {
    await table.close()
  }
})

test('hunter mark kills the selected player when the hunter dies at night', async ({
  browser,
}) => {
  test.setTimeout(240_000)
  const table = await createTable(browser, 8)

  try {
    await startTable(table)

    const hunter = await findPlayerByRole(table.players, 'Thợ săn')
    const markedPlayer = await findPlayerByRole(table.players, 'Dân làng')
    const protector = await findPlayerByRole(table.players, 'Bảo vệ')
    const seer = await findPlayerByRole(table.players, 'Tiên tri')
    const werewolf = await findPlayerByRole(table.players, 'Ma sói')
    const witch = await findPlayerByRole(table.players, 'Phù thủy')

    await submitAndConfirmNightAction(
      table.moderator.page,
      hunter,
      markedPlayer.name,
    )
    await submitAndConfirmNightAction(
      table.moderator.page,
      protector,
      werewolf.name,
    )
    await submitAndConfirmNightAction(table.moderator.page, seer, werewolf.name)
    await submitAndConfirmNightAction(
      table.moderator.page,
      werewolf,
      hunter.name,
    )
    await submitAndConfirmNightAction(table.moderator.page, witch)

    await table.moderator.page.reload()
    const resolution = table.moderator.page
      .getByText('Kết quả dự kiến')
      .locator('..')
    await expect(resolution).toBeVisible()
    await expect(resolution.getByText(hunter.name)).toBeVisible()
    await expect(resolution.getByText(markedPlayer.name)).toBeVisible()
    await table.moderator.page
      .getByRole('button', { name: 'Công bố kết quả và mở ngày' })
      .click()

    await expect(
      table.moderator.page.getByRole('heading', {
        name: 'Mở thảo luận ban ngày',
      }),
    ).toBeVisible()
    await hunter.page.reload()
    await expect(hunter.page.getByText('Bạn đang quan sát')).toBeVisible()
  } finally {
    await table.close()
  }
})

test('voted-out hunter selects and kills a player before the next night', async ({
  browser,
}) => {
  test.setTimeout(240_000)
  const table = await createTable(browser, 8)

  try {
    await startTable(table)

    const hunter = await findPlayerByRole(table.players, 'Thợ săn')
    const shotTarget = await findPlayerByRole(table.players, 'Dân làng')

    await skipNight(table.moderator.page)
    await table.moderator.page
      .getByRole('button', { name: 'Công bố kết quả và mở ngày' })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Bắt đầu biểu quyết' })
      .click()
    await table.moderator.page
      .getByRole('button', { name: hunter.name, exact: true })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Ghi nhận kết quả biểu quyết' })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Xác nhận kết quả' })
      .click()

    await expect(
      table.moderator.page.getByText('Đang chờ Thợ săn chọn người kéo theo.'),
    ).toBeVisible()
    await shotTarget.page.reload()
    await expect(
      shotTarget.page.getByRole('button', { name: shotTarget.name }),
    ).toHaveCount(0)

    await hunter.page.reload()
    await hunter.page
      .getByRole('button', { name: shotTarget.name, exact: true })
      .click()
    const submitShot = hunter.page.getByRole('button', {
      name: 'Gửi mục tiêu cho Quản trò',
    })
    await submitShot.click()
    await expect(submitShot).toBeHidden()

    const confirmShot = table.moderator.page.getByRole('button', {
      name: 'Xác nhận phát bắn',
    })
    await expect(async () => {
      await table.moderator.page.reload()
      await expect(confirmShot).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    await confirmShot.click()
    await expect(confirmShot).toBeHidden()

    await expect(playerRow(table.moderator.page, hunter.name)).toContainText(
      'Đã chết',
    )
    await expect(
      playerRow(table.moderator.page, shotTarget.name),
    ).toContainText('Đã chết')
  } finally {
    await table.close()
  }
})

async function skipNight(moderatorPage: Page) {
  for (let completedSteps = 0; completedSteps < 5; completedSteps += 1) {
    await moderatorPage
      .getByLabel('Bỏ qua bước với lý do')
      .fill('E2E vote setup')
    await moderatorPage.getByRole('button', { name: 'Bỏ qua lượt này' }).click()
    if (completedSteps < 4) {
      await expect(
        moderatorPage.getByText('Bỏ qua', { exact: true }),
      ).toHaveCount(completedSteps + 1)
    }
  }
  await expect(moderatorPage.getByText('Kết quả dự kiến')).toBeVisible()
}

function playerRow(page: Page, playerName: string) {
  return page.getByRole('listitem').filter({ hasText: playerName })
}

async function submitAndConfirmNightAction(
  moderatorPage: Page,
  actor: TablePlayer,
  targetName?: string,
) {
  await actor.page.reload()
  if (targetName) {
    await actor.page.getByRole('button', { name: targetName }).click()
  }
  const submit = actor.page.getByRole('button', {
    name: 'Gửi hành động cho Quản trò',
  })
  await submit.click()
  await expect(submit).toBeHidden()

  const confirm = moderatorPage.getByRole('button', {
    name: 'Xác nhận hành động',
  })
  await expect(async () => {
    await moderatorPage.reload()
    await expect(confirm).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })
  await confirm.click()
  await expect(confirm).toBeHidden()
}
