import type { TablePlayer } from './fixtures/table'
import type { Locator, Page } from '@playwright/test'

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import {
  findRoleOwners,
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from './fixtures/table'

// Kịch bản "đạo diễn" chế độ MODERATED (revamp M1–M13): quản trò điều phối
// trọn ván 8 người qua UI thật và chụp lại mọi thay đổi mới để user duyệt —
// entry "Quản trò", god-view phân vai, proxy picker đêm (M2), hoàn tác bước
// (M9), relay "Sói đã chọn" + card "Báo Tiên tri" (M4), gate bình minh (M3),
// sổ tay riêng trên /table (M4), phiếu thiết bị + monitor counts live (M6),
// override chết tay (M10), fallback đếm tay, Đêm 02 tự skip người chết.
// Ảnh lưu captures/moderator-mode-<ngày>/; khung đắt giá nhất có cả bản
// desktop 1600 và mobile 390 (setViewportSize — game là mobile-first).
// Chạy: pnpm test:capture e2e/portfolio-capture-moderator.spec.ts

const OUT_DIR = join(process.cwd(), 'captures/moderator-mode-2026-10-05')

const DESKTOP = { width: 1600, height: 1000 }
const MOBILE = { width: 390, height: 844 }
const CAMERA_CONTEXT = {
  viewport: DESKTOP,
  deviceScaleFactor: 2,
} as const

// TanStack Devtools + nút đổi theme là công cụ dev — ẨN BẰNG CSS thuần:
// gỡ node khỏi DOM làm React văng "removeChild" khi re-render (nó quản
// subtree đó).
const HIDE_CSS = `
  html { scrollbar-width: none; }
  ::-webkit-scrollbar { display: none; }
  .theme-switcher, .theme-switcher-root { display: none !important; }
  [data-testid="tanstack_devtools"], tanstack-devtools { display: none !important; }
`

async function dress(page: Page) {
  await page.addStyleTag({ content: HIDE_CSS })
}

async function shoot(page: Page, name: string) {
  await dress(page)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`) })
}

// Hai bản cùng khoảnh khắc: desktop 1600 (khung portfolio) + mobile 390
// (khung chính để duyệt — game là mobile-first).
async function shootBoth(page: Page, name: string) {
  await shoot(page, name)
  await page.setViewportSize(MOBILE)
  await shoot(page, `${name}-390`)
  await page.setViewportSize(DESKTOP)
}

// Page nền trong test không refetch đáng tin — reload nhẹ lặp lại cho tới khi
// nội dung mong đợi xuất hiện (pattern của spec SELF/MODERATED).
async function reloadUntilVisible(
  page: Page,
  locate: () => Locator,
  timeout: number,
): Promise<void> {
  await expect(async () => {
    await page.reload()
    await expect(locate()).toBeVisible({ timeout: 4_000 })
  }).toPass({ timeout })
}

// Form proxy của bước đang ACTIVE — scope vào <form> để không trúng token
// cùng tên ở lưới roster bên dưới (strict mode).
function proxyForm(moderatorPage: Page, submitLabel: string): Locator {
  return moderatorPage.locator('form').filter({
    has: moderatorPage.getByRole('button', { name: submitLabel, exact: true }),
  })
}

async function submitProxyForm(form: Locator, submitLabel: string) {
  const submit = form.getByRole('button', { name: submitLabel, exact: true })
  await submit.click()
  await expect(submit).toBeHidden()
}

// Bỏ phiếu trên /table kèm xác minh (phiếu cuối có thể nhảy thẳng kết quả).
async function voteAndVerify(voter: TablePlayer, targetName: string) {
  await expect(async () => {
    await voter.page.reload()
    const done = voter.page.getByText('Đã ghi phiếu của bạn').first()
    const gameOver = voter.page.getByText('Sự thật được lộ ra').first()
    const ballot = voter.page.getByRole('button', { name: 'Ghi phiếu' }).first()
    await expect(done.or(gameOver).or(ballot)).toBeVisible({ timeout: 15_000 })
    if (await done.isVisible().catch(() => false)) return
    if (await gameOver.isVisible().catch(() => false)) return
    await voter.page
      .getByRole('button', { name: targetName, exact: true })
      .click()
    await ballot.click()
    await expect(done.or(gameOver)).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 90_000 })
}

test('MODERATED: đạo diễn ván 8 người qua màn quản trò và chụp mọi khoảnh khắc mới', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  mkdirSync(OUT_DIR, { recursive: true })

  // ===== Màn entry: menu + form tạo phòng (không tốn slot player) =====
  const viewerContext = await browser.newContext(CAMERA_CONTEXT)
  const viewer = await viewerContext.newPage()
  await viewer.goto('/play')
  await expect(viewer.getByRole('button', { name: /^Quản trò/ })).toBeVisible()
  await shoot(viewer, '01-entry-menu')
  await viewer.getByRole('button', { name: /^Quản trò/ }).click()
  await expect(viewer.getByLabel('Tên của bạn')).toBeVisible()
  await viewer.getByLabel('Tên của bạn').fill('Trọng Tài')
  await shootBoth(viewer, '02-tao-phong-quan-tro')
  await viewerContext.close()

  // ===== Bàn thật 8 người =====
  const table: Awaited<ReturnType<typeof createTable>> = await createTable(
    browser,
    8,
    { moderatorName: 'Trọng Tài', contextOptions: CAMERA_CONTEXT },
  )

  try {
    const firstPlayer = table.players[0]
    if (!firstPlayer) throw new Error('Players are missing')
    await shoot(firstPlayer.page, '03-lobby-nguoi-choi')
    await shoot(table.moderator.page, '04-lobby-quan-tro')
    await startTable(table)

    // Đọc vai 1 lần từ roster god-view (Map role → danh sách tên; 8 người có
    // 2 Ma sói). Nạn nhân mark/override lấy từ roster 'Dân làng' để override
    // không trúng Sói — trúng Sói sẽ đảo điều kiện thắng.
    const roles = await findRoleOwners(table.moderator.page)
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const werewolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const [markedName, overrideName] = roles.get('Dân làng') ?? []
    if (!markedName || !overrideName) {
      throw new Error('Not enough villagers for the scenario')
    }
    const markedPlayer = playerByName(table, markedName)
    const overrideVictim = playerByName(table, overrideName)

    // ===== Đêm 1 =====
    // M13: /table là màn tĩnh — không "đang chờ ai", không hàng đợi đêm.
    await reloadUntilVisible(
      hunter.page,
      () => hunter.page.getByText('Cả bàn nhắm mắt'),
      30_000,
    )
    await shootBoth(hunter.page, '05-dem-tinh-ban-choi')

    // M4: god-view quản trò — roster vai + form proxy bước đầu.
    await expect(table.moderator.page.getByText('Đêm 01')).toBeVisible()
    await shoot(table.moderator.page, '06-dem-god-view-phan-vai')

    // M2: picker chọn giúp Thợ săn — chụp khi mục tiêu đã chọn, trước khi ghi.
    const hunterForm = proxyForm(
      table.moderator.page,
      'Ghi nhận lựa chọn của Thợ săn',
    )
    await hunterForm
      .getByRole('button', { name: markedPlayer.name, exact: true })
      .click()
    await shootBoth(table.moderator.page, '07-proxy-hunter-chon')
    await submitProxyForm(hunterForm, 'Ghi nhận lựa chọn của Thợ săn')

    // M9: hoàn tác bước vừa rồi — dialog lý do bắt buộc.
    await table.moderator.page
      .getByRole('button', { name: 'Hoàn tác bước vừa rồi' })
      .click()
    const undoDialog = table.moderator.page.locator('dialog[open]')
    await expect(undoDialog).toBeVisible()
    await shoot(table.moderator.page, '08-undo-hoan-tac-buoc')
    await undoDialog.getByLabel('Lý do hoàn tác (bắt buộc)').fill('Chọn nhầm')
    await undoDialog
      .getByRole('button', { name: 'Hoàn tác', exact: true })
      .click()
    await expect(undoDialog).toBeHidden()
    // Form proxy giữ state đã chọn trong React — reload cho picker sạch.
    await table.moderator.page.reload()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: markedPlayer.name,
    })

    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: werewolf.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: werewolf.name,
    })
    // M4: card "Báo Tiên tri" hiện sau khi soi được ghi nhận.
    await expect(table.moderator.page.getByText('Báo Tiên tri')).toBeVisible()
    await shoot(table.moderator.page, '09-bao-tien-tri')

    // Sói cắn Thợ săn — bước Ma sói phải ghi xong thì Phù thủy mới tới lượt.
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: hunter.name,
    })
    // M4: relay "Sói đã chọn" + picker Phù thủy trên cùng màn — chờ relay
    // hiện (view đã refetch xong bước witch) rồi mới chụp, tránh dính khung
    // refetch "Đang cập nhật…".
    await expect(table.moderator.page.getByText('Báo Phù thủy')).toBeVisible({
      timeout: 20_000,
    })
    await shoot(table.moderator.page, '10-dem-phu-thuy-relay')
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Phù thủy',
    })

    // ===== M3: gate bình minh — chưa công bố thì người bị cắn vẫn "sống" =====
    await expect(
      table.moderator.page.getByText('Kết quả dự kiến'),
    ).toBeVisible()
    await shoot(table.moderator.page, '11-binh-minh-gate')
    await table.moderator.page
      .getByRole('button', { name: 'Công bố kết quả và mở ngày' })
      .click()
    await expect(
      table.moderator.page.getByRole('heading', {
        name: 'Mở thảo luận ban ngày',
      }),
    ).toBeVisible()

    // M4: sổ tay riêng của Tiên tri trên /table — SecretRow giữ kín tới khi
    // chạm (chống nhìn trộm); chạm dòng soi để mở khóa rồi mới chụp.
    await seer.page.reload()
    await seer.page.getByRole('button', { name: /Sổ tay của vai bạn/ }).click()
    await seer.page.getByRole('button', { name: /Soi · / }).click()
    await expect(seer.page.getByText('MA SÓI')).toBeVisible()
    await shootBoth(seer.page, '12-seer-so-tay-rieng')

    // ===== M6/M7: biểu quyết qua thiết bị — phiếu + counts live =====
    await table.moderator.page
      .getByRole('button', { name: 'Bắt đầu biểu quyết' })
      .click()
    // Khung biểu quyết với mục tiêu đã chọn (Sói vote Tiên tri). Click ngay
    // sau reload có thể rơi trước hydration → chọn xong phải thấy "Ghi phiếu"
    // bật sáng rồi mới chụp.
    await expect(async () => {
      await werewolf.page.reload()
      const ballot = werewolf.page
        .getByRole('button', { name: 'Ghi phiếu' })
        .first()
      await expect(ballot).toBeVisible({ timeout: 8_000 })
      await werewolf.page
        .getByRole('button', { name: seer.name, exact: true })
        .click()
      await expect(ballot).toBeEnabled({ timeout: 5_000 })
    }).toPass({ timeout: 90_000 })
    await shootBoth(werewolf.page, '13-vote-thiet-bi-chon')
    await voteAndVerify(werewolf, seer.name)
    await voteAndVerify(seer, werewolf.name)
    // Monitor quản trò: tổng + counts theo ứng viên, KHÔNG lộ ai bỏ ai.
    await expect(table.moderator.page.getByText('2/6 phiếu')).toBeVisible()
    await shootBoth(table.moderator.page, '14-vote-monitor-counts-live')

    // ===== M10: override chết tay giữa biểu quyết =====
    await table.moderator.page
      .getByRole('button', { name: 'Đánh dấu người bỏ khỏi ván' })
      .click()
    const overrideDialog = table.moderator.page.locator('dialog[open]')
    await expect(overrideDialog).toBeVisible()
    await shoot(table.moderator.page, '15-override-danh-dau-chet')
    await overrideDialog
      .getByRole('button', { name: overrideVictim.name, exact: true })
      .click()
    await overrideDialog.getByLabel('Lý do (bắt buộc)').fill('Bỏ về giữa ván')
    await overrideDialog
      .getByRole('button', { name: 'Đánh dấu đã chết', exact: true })
      .click()
    await expect(overrideDialog).toBeHidden()
    await expect(
      table.moderator.page
        .getByRole('listitem')
        .filter({ hasText: overrideVictim.name })
        .first(),
    ).toContainText('Đã chết')
    await shoot(table.moderator.page, '16-roster-sau-override')

    // ===== M6: fallback đếm tay — loại Sói, ván đi tiếp sang Đêm 02 =====
    await table.moderator.page
      .getByText('Nhập kết quả đếm tay (dự phòng)')
      .click()
    await shoot(table.moderator.page, '17-vote-dem-tay-du-phong')
    await table.moderator.page
      .getByRole('button', { name: werewolf.name, exact: true })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Ghi nhận kết quả biểu quyết' })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Xác nhận kết quả' })
      .click()

    // Đêm 02 — bước của người chết tự skip, tới lượt Bảo vệ.
    await expect(table.moderator.page.getByText('Đêm 02')).toBeVisible()
    await expect(
      table.moderator.page.getByRole('button', {
        name: 'Ghi nhận lựa chọn của Bảo vệ',
      }),
    ).toBeVisible()
    await shoot(table.moderator.page, '18-dem-02-tu-skip-nguoi-chet')
  } finally {
    await table.close()
  }
})
