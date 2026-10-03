import type { TablePlayer } from './fixtures/table'
import type { Page } from '@playwright/test'

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { createTable } from './fixtures/table'

// Spec chụp BEFORE/AFTER cho vòng task UI 2026-10-03 (docs/tasks-2026-10-03.md).
// Điều phối một ván thật tới đêm 2 và chụp các màn bị tác động. KHÔNG nằm trong
// suite thường: chỉ chạy khi UI_TASKS_CAPTURE=1 (testMatch "capture" có chung
// tiền tố portfolio-capture để dự án chromium tự loại, nhưng test:capture
// thường vẫn phải skip nó — nên có cổng env).
//
// Chạy một lượt:
//   UI_TASKS_CAPTURE=1 CAPTURE_DIR=captures/ui-tasks-2026-10-03/after-390 \
//   pnpm exec playwright test e2e/portfolio-capture-ui-tasks.spec.ts --project=capture
//
// Env: CAPTURE_DIR (mặc định captures/ui-tasks-2026-10-03),
// CAPTURE_W/CAPTURE_H/CAPTURE_DPR (mặc định 390×844 @2x — mobile-first).
// Quy ước: MỌI output chụp test lưu trong captures/ (xem AGENTS.md).

const OUT_DIR = join(
  process.cwd(),
  process.env.CAPTURE_DIR ?? 'captures/ui-tasks-2026-10-03',
)
const VIEWPORT = {
  viewport: {
    width: Number(process.env.CAPTURE_W ?? 390),
    height: Number(process.env.CAPTURE_H ?? 844),
  },
  deviceScaleFactor: Number(process.env.CAPTURE_DPR ?? 2),
}

const PARTY_NAMES = [
  'Mai Phương',
  'Tuấn Kiệt',
  'Bảo Ngọc',
  'Hải Đăng',
  'Kim Chi',
  'Quang Huy',
  'Trâm Anh',
  'Duy Mạnh',
]

// Công cụ dev (devtools TanStack, nút đổi theme) — ẩn khỏi khung hình.
const HIDE_CSS = `
  html { scrollbar-width: none; }
  ::-webkit-scrollbar { display: none; }
  .theme-switcher, .theme-switcher-root { display: none !important; }
`

async function dress(page: Page) {
  await page.addStyleTag({ content: HIDE_CSS })
  await page.evaluate(() => {
    document
      .querySelector('[data-testid="tanstack_devtools"]')
      ?.parentElement?.remove()
    document.querySelectorAll('tanstack-devtools').forEach((el) => el.remove())
    for (const el of [...document.body.children]) {
      if (
        el.tagName === 'DIV' &&
        el.getAttribute('style') === 'position:absolute'
      ) {
        el.remove()
      }
    }
  })
}

async function shoot(page: Page, name: string) {
  await dress(page)
  // Đợi crossfade nền pha (700ms) kết thúc trước khi bấm máy.
  await page.waitForTimeout(1000)
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`) })
}

async function reloadAndWait(page: Page, marker: string | RegExp) {
  await expect(async () => {
    await page.reload()
    await expect(page.getByText(marker).first()).toBeVisible({
      timeout: 4_000,
    })
  }).toPass({ timeout: 120_000 })
  await dress(page)
}

async function submitNightAction(
  actor: TablePlayer,
  options: { targetName?: string; heal?: boolean; shotName?: string } = {},
) {
  const submit = actor.page.getByRole('button', {
    name: 'Gửi hành động cho Quản trò',
  })
  // Marker ổn định trong ván: nút "Xem vai trò" luôn hiện cho người chơi,
  // không phụ thuộc helper text nào có thể bị đổi theo vòng task UI.
  const inGameMarker = actor.page
    .getByRole('button', { name: /Xem vai trò/ })
    .first()
  await expect(async () => {
    await actor.page.reload()
    await expect(inGameMarker).toBeVisible({ timeout: 4_000 })
    if (options.heal) {
      await actor.page.getByLabel('Dùng bình cứu').check()
    }
    if (options.targetName) {
      await actor.page
        .getByRole('button', { name: options.targetName, exact: true })
        .click()
    }
    await expect(submit).toBeVisible({ timeout: 4_000 })
  }).toPass({ timeout: 90_000 })
  if (options.shotName) {
    await shoot(actor.page, options.shotName)
  }
  await submit.click()
  await expect(submit).toBeHidden()
}

async function confirmSubmittedAction(moderatorPage: Page, shotName?: string) {
  const confirm = moderatorPage.getByRole('button', {
    name: 'Xác nhận hành động',
  })
  await expect(async () => {
    await moderatorPage.reload()
    await expect(confirm).toBeVisible({ timeout: 4_000 })
  }).toPass({ timeout: 90_000 })
  if (shotName) {
    await shoot(moderatorPage, shotName)
  }
  await confirm.click()
  await expect(confirm).toBeHidden()
}

async function moderatorProceed(
  moderatorPage: Page,
  marker: string | RegExp,
  buttonName: string,
  shotName?: string,
) {
  const button = moderatorPage.getByRole('button', { name: buttonName })
  await expect(async () => {
    await moderatorPage.reload()
    await expect(moderatorPage.getByText(marker).first()).toBeVisible({
      timeout: 4_000,
    })
  }).toPass({ timeout: 90_000 })
  if (shotName) {
    await shoot(moderatorPage, shotName)
  }
  await button.click()
}

async function findAllByRole(
  players: TablePlayer[],
  roleName: string,
  expected: number,
): Promise<TablePlayer[]> {
  const found: TablePlayer[] = []
  for (const player of players) {
    const flip = player.page.getByRole('button', { name: 'Xem thẻ vai' })
    await expect(flip).toBeVisible()
    await flip.click()
    const matches = await player.page
      .getByText(roleName, { exact: true })
      .count()
    await player.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()
    if (matches > 0) found.push(player)
  }
  if (found.length !== expected) {
    throw new Error(
      `Expected ${expected} player(s) with role "${roleName}", found ${found.length}`,
    )
  }
  return found
}

test('điều phối ván thật và chụp các màn của vòng task UI 2026-10-03', async ({
  browser,
}) => {
  test.setTimeout(30 * 60_000)
  test.skip(
    process.env.UI_TASKS_CAPTURE !== '1',
    'Spec chụp chạy có chủ ý — đặt UI_TASKS_CAPTURE=1 để bật',
  )
  mkdirSync(OUT_DIR, { recursive: true })

  const table = await createTable(browser, 8, {
    moderatorName: 'Hoàng Anh',
    playerNames: PARTY_NAMES,
    contextOptions: VIEWPORT,
  })

  try {
    const mod = table.moderator.page

    // 01 — Lobby Quản trò: THỨ TỰ khối điều khiển ↔ lưới người chơi (task 2).
    await shoot(mod, '01-lobby-quan-tro')

    await mod.getByRole('button', { name: 'Xáo và phân vai' }).click()
    await expect(
      mod.getByRole('button', { name: 'Xáo và phân lại vai' }),
    ).toBeVisible()
    await shoot(mod, '02-lobby-phan-vai')

    const [wolf1, wolf2] = await findAllByRole(table.players, 'Ma sói', 2)
    const [seer] = await findAllByRole(table.players, 'Tiên tri', 1)
    const [witch] = await findAllByRole(table.players, 'Phù thủy', 1)
    const [protector] = await findAllByRole(table.players, 'Bảo vệ', 1)
    const [hunter] = await findAllByRole(table.players, 'Thợ săn', 1)
    const [villager1, villager2] = await findAllByRole(
      table.players,
      'Dân làng',
      2,
    )

    for (const { page } of table.players) {
      await expect(async () => {
        const ready = page.getByRole('button', {
          name: 'Tôi đã xem vai và sẵn sàng',
        })
        if ((await ready.count()) > 0) {
          await ready.click()
        }
        await expect(
          page.getByRole('button', { name: 'Hủy sẵn sàng' }),
        ).toBeVisible({ timeout: 4_000 })
      }).toPass({ timeout: 60_000 })
    }
    const start = mod.getByRole('button', { name: 'Bắt đầu đêm đầu tiên' })
    await expect(start).toBeEnabled()
    await start.click()
    await expect(mod).toHaveURL(/\/game$/)

    // ── Đêm 1 ─────────────────────────────────────────────────────────────
    // Kịch bản: Sói cắn Dân 1 → Phù thủy cứu → bình minh an lành; Tiên tri
    // soi ra Sói 1 → ban ngày treo Sói 1. Đêm 2 dừng ở màn Tiên tri (lịch sử
    // + form cùng màn — ảnh chuẩn của task 1).
    await reloadAndWait(mod, 'Bảng Quản trò')
    await shoot(mod, '03-dem-1-hang-doi')

    await submitNightAction(hunter, { targetName: villager1.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(protector, { targetName: protector.name })
    await confirmSubmittedAction(mod)

    await submitNightAction(seer, {
      targetName: wolf1.name,
      shotName: '04-dem-1-tien-tri-chon',
    })
    await confirmSubmittedAction(mod)

    // Lịch sử soi mở kín — khối "history trước form" của task 1.
    await expect(async () => {
      await seer.page.reload()
      await expect(seer.page.getByText('Lịch sử soi')).toBeVisible({
        timeout: 4_000,
      })
    }).toPass({ timeout: 90_000 })
    // Sau vòng task UI, lịch sử nằm trong disclosure thu gọn — bấm mở nếu cần.
    const historyToggle = seer.page.getByRole('button', { name: /Lịch sử soi/ })
    if (
      (await historyToggle.count()) > 0 &&
      (await seer.page.getByRole('button', { name: 'Xem kết quả' }).count()) ===
        0
    ) {
      await historyToggle.click()
    }
    await seer.page.getByRole('button', { name: 'Xem kết quả' }).click()
    await shoot(seer.page, '05-dem-1-tien-tri-lich-su')

    await submitNightAction(wolf1, { targetName: villager1.name })
    await confirmSubmittedAction(mod)

    await submitNightAction(witch, {
      heal: true,
      shotName: '06-dem-1-phu-thuy',
    })
    await confirmSubmittedAction(mod)

    // Gần sáng phía người chơi (NIGHT_RESOLUTION) — AccentIndicator pha dawn.
    try {
      await reloadAndWait(villager2.page, 'Gần sáng')
      await shoot(villager2.page, '07-gan-sang-nguoi-choi')
    } catch {
      // Pha chuyển nhanh nếu Quản trò bấm tiếp — ảnh này là best-effort.
    }

    // ── Ngày 1 ────────────────────────────────────────────────────────────
    await moderatorProceed(mod, 'Kết quả dự kiến', 'Công bố kết quả và mở ngày')
    await reloadAndWait(villager2.page, 'Cùng bàn thảo luận')
    await shoot(villager2.page, '08-ngay-thao-luan')

    await moderatorProceed(mod, 'Mở thảo luận ban ngày', 'Bắt đầu biểu quyết')
    const voteToken = mod.getByRole('button', {
      name: wolf1.name,
      exact: true,
    })
    await expect(async () => {
      await mod.reload()
      await expect(voteToken).toBeVisible({ timeout: 4_000 })
    }).toPass({ timeout: 90_000 })
    await voteToken.click()
    await shoot(mod, '09-bieu-quyet')
    await mod
      .getByRole('button', { name: 'Ghi nhận kết quả biểu quyết' })
      .click()
    const voteResult = mod.getByText(`${wolf1.name} sẽ bị loại`)
    await expect(async () => {
      await mod.reload()
      await expect(voteResult).toBeVisible({ timeout: 90_000 })
    }).toPass({ timeout: 120_000 })
    await shoot(mod, '10-ket-qua-bieu-quyet')
    await mod.getByRole('button', { name: 'Xác nhận kết quả' }).click()

    // ── Đêm 2 — dừng ở màn Tiên tri: lịch sử soi + form cùng màn hình ────
    await submitNightAction(hunter, { targetName: villager2.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(protector, { targetName: seer.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(seer, {
      targetName: wolf2.name,
      shotName: '11-dem-2-tien-tri-lich-su-va-form',
    })
  } finally {
    await table.close()
  }
})
