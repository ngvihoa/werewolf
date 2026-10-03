import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { createTable, type TablePlayer } from './fixtures/table'

// Kịch bản "đạo diễn": 9 trình duyệt chơi trọn một ván Ma Sói qua UI thật
// (tương tác y như người chơi, không gọi API trực tiếp) và chụp lại các
// khoảnh khắc đắt giá vào portfolio-assets/ để dùng làm asset portfolio.
// Chạy: pnpm test:capture

const OUT_DIR = join(process.cwd(), 'portfolio-assets')

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

const PLAYER_READY_MARKER = 'Thông tin trên màn hình này chỉ dành cho bạn.'

// Mọi context đều là "góc quay": cùng một khung chuẩn SHOT_SIZE với DPR 2,
// kèm ghi video để dựng reel. Mọi ảnh xuất ra đều đúng một kích thước
// (w_A = w_B, h_A = h_B) — nội dung tràn khung thì cắt, nền phase phủ đầy.
const SHOT_SIZE = { width: 1600, height: 1000 }
const CAMERA_CONTEXT = {
  viewport: SHOT_SIZE,
  deviceScaleFactor: 2,
  recordVideo: {
    dir: 'portfolio-assets/videos',
    size: { width: 960, height: 600 },
  },
} as const

// TanStack Devtools + nút đổi theme là công cụ dev — ẩn khỏi mọi khung hình.
const HIDE_CSS = `
  html { scrollbar-width: none; }
  ::-webkit-scrollbar { display: none; }
  .theme-switcher, .theme-switcher-root { display: none !important; }
`

async function dress(page: Page) {
  await page.addStyleTag({ content: HIDE_CSS })
  await page.evaluate(() => {
    // Công cụ dev của TanStack: trigger nằm trong div[classless] cuối body
    // (div[data-testid="tanstack_devtools"]), panel router nằm trong div
    // position:absolute trực tiếp dưới body.
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
  // Đợi crossfade nền phase (700ms) và các chuyển động CSS kết thúc.
  await page.waitForTimeout(1000)
  // Không đụng vào viewport: mọi ảnh dùng đúng khung SHOT_SIZE của context
  // nên cả bộ đồng nhất w×h. Nội dung cao hơn khung tự bị cắt ở đáy.
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
  await expect(async () => {
    await actor.page.reload()
    await expect(actor.page.getByText(PLAYER_READY_MARKER).first()).toBeVisible(
      { timeout: 4_000 },
    )
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

// Chờ một cột mốc trên trang Quản trò (reload vòng lặp vì view cập nhật qua
// polling), chụp ảnh nếu cần, rồi bấm nút chuyển giai đoạn.
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

test('dẫn dắt một ván Ma Sói trọn vẹn và chụp asset portfolio', async ({
  browser,
}) => {
  test.setTimeout(30 * 60_000)
  mkdirSync(OUT_DIR, { recursive: true })

  // 00 — Trang chủ có logo, làm khung mở đầu cho bộ asset.
  const landingContext = await browser.newContext(CAMERA_CONTEXT)
  const landingPage = await landingContext.newPage()
  await landingPage.goto('/')
  await landingPage.waitForLoadState('networkidle')
  await shoot(landingPage, '00-landing')
  await landingContext.close()

  const table = await createTable(browser, 8, {
    moderatorName: 'Hoàng Anh',
    playerNames: PARTY_NAMES,
    contextOptions: CAMERA_CONTEXT,
  })

  try {
    const mod = table.moderator.page

    // 01 — Sảnh chờ đủ 8 người chơi.
    await shoot(mod, '01-lobby')

    // Phân vai ngẫu nhiên rồi chụp "bảng bí mật" của Quản trò.
    await mod.getByRole('button', { name: 'Xáo và phân vai' }).click()
    await expect(
      mod.getByRole('button', { name: 'Xáo và phân lại vai' }),
    ).toBeVisible()
    await shoot(mod, '02-phan-vai-bi-mat')

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

    // 03 — Thẻ vai Tiên tri lật mở, góc nhìn riêng của người chơi.
    const seerFlip = seer.page.getByRole('button', { name: 'Xem thẻ vai' })
    await seerFlip.click()
    await expect(
      seer.page.getByRole('button', { name: 'Ẩn thẻ vai' }),
    ).toBeVisible()
    await shoot(seer.page, '03-the-vai-tien-tri')
    await seer.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()

    // Mọi người xác nhận đã xem vai, Quản trò mở đêm đầu tiên.
    // Lượt ready có thể bị từ chối vì version stale — bấm lại tới khi chắc.
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

    // ── Đêm 1 ────────────────────────────────────────────────────────────
    // Kịch bản drama: Sói cắn Dân làng 1 → Phù thủy cứu → bình minh an lành.
    // Tiên tri soi ra Sói 1 → ban ngày cả làng bỏ phiếu treo Sói 1.

    // 04 — Hàng đợi đêm trên bàn Quản trò.
    await reloadAndWait(mod, 'Bảng Quản trò')
    await shoot(mod, '04-dem-hang-doi')

    // 04b — Dialog "Xem vai trò" mở: thẻ hiện mặt giữa nền mờ.
    const seerRoleButton = seer.page.getByRole('button', {
      name: /Xem vai trò/,
    })
    await expect(async () => {
      await seer.page.reload()
      await expect(seerRoleButton).toBeVisible({ timeout: 4_000 })
    }).toPass({ timeout: 90_000 })
    await seerRoleButton.click()
    const roleDialog = seer.page.locator('dialog[open]')
    await expect(roleDialog).toBeVisible()
    await dress(seer.page)
    await seer.page.waitForTimeout(900)
    await shoot(seer.page, '04b-xem-vai-tro-dialog')
    await seer.page.getByRole('button', { name: 'Đóng thẻ vai' }).click()
    await expect(roleDialog).toBeHidden()

    await submitNightAction(hunter, { targetName: villager1.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(protector, { targetName: protector.name })
    await confirmSubmittedAction(mod)

    // 05 — Tiên tri chọn soi Sói 1.
    await submitNightAction(seer, {
      targetName: wolf1.name,
      shotName: '05-tien-tri-chon',
    })
    // 06 — Quản trò duyệt hành động (màn hình điều phối đặc trưng).
    await confirmSubmittedAction(mod, '06-quan-tro-duyet')

    // Kết quả soi hiện riêng cho Tiên tri (thẻ bí mật cần bấm mở).
    await expect(async () => {
      await seer.page.reload()
      await expect(seer.page.getByText('Lịch sử soi')).toBeVisible({
        timeout: 4_000,
      })
    }).toPass({ timeout: 90_000 })
    await seer.page.getByRole('button', { name: 'Xem kết quả' }).click()
    await shoot(seer.page, '07-tien-tri-ket-qua')

    // 08 — Ma sói chọn nạn nhân.
    await submitNightAction(wolf1, {
      targetName: villager1.name,
      shotName: '08-ma-soi-chon-nan-nhan',
    })
    await confirmSubmittedAction(mod)

    // 09 — Phù thủy mở "Mục tiêu của Ma sói" và dùng bình cứu.
    await submitNightAction(witch, {
      heal: true,
      shotName: '09-phu-thuy-binh-cuu',
    })
    await confirmSubmittedAction(mod)

    // 10 — Bình minh an lành: không ai bị loại.
    await moderatorProceed(
      mod,
      'Kết quả dự kiến',
      'Công bố kết quả và mở ngày',
      '10-binh-minh-an-lanh',
    )

    // ── Ngày 1 ───────────────────────────────────────────────────────────
    // 11 — Bàn dân làng thảo luận.
    await reloadAndWait(villager2.page, 'Cùng bàn thảo luận')
    await shoot(villager2.page, '11-ngay-thao-luan')

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
    // 12 — Phiếu biểu quyết nhắm vào Sói 1.
    await shoot(mod, '12-bieu-quyet')
    await mod
      .getByRole('button', { name: 'Ghi nhận kết quả biểu quyết' })
      .click()
    const voteResult = mod.getByText(`${wolf1.name} sẽ bị loại`)
    await expect(async () => {
      await mod.reload()
      await expect(voteResult).toBeVisible({ timeout: 4_000 })
    }).toPass({ timeout: 90_000 })
    // 13 — Kết quả biểu quyết: loại Sói 1.
    await shoot(mod, '13-ket-qua-bieu-quyet')
    await mod.getByRole('button', { name: 'Xác nhận kết quả' }).click()

    // ── Đêm 2 ────────────────────────────────────────────────────────────
    // Sói còn lại cắn Bảo vệ; Tiên tri soi ra Sói 2; Phù thủy đầu độc Sói 2
    // → hai cái chết trong một đêm → phe Dân làng thắng.
    await submitNightAction(hunter, { targetName: villager2.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(protector, { targetName: seer.name })
    await confirmSubmittedAction(mod)
    await submitNightAction(seer, { targetName: wolf2.name })
    await confirmSubmittedAction(mod)

    // 14 — Ma sói cuối cùng chọn nạn nhân đêm 2.
    await submitNightAction(wolf2, {
      targetName: protector.name,
      shotName: '14-ma-soi-dem-02',
    })
    await confirmSubmittedAction(mod)

    // 15 — Phù thủy dùng bình độc với Sói 2.
    await submitNightAction(witch, {
      targetName: wolf2.name,
      shotName: '15-phu-thuy-binh-doc',
    })
    await confirmSubmittedAction(mod)

    // 16 — Bình minh đẫm máu: hai người chết trong đêm.
    await moderatorProceed(
      mod,
      'Kết quả dự kiến',
      'Công bố kết quả và mở ngày',
      '16-binh-minh-tham-doat',
    )

    // ── Kết thúc ─────────────────────────────────────────────────────────
    // 17 — Màn chiến thắng của phe Dân làng, toàn bộ vai trò lộ ra.
    await reloadAndWait(villager2.page, 'Phe Dân làng chiến thắng')
    await shoot(villager2.page, '17-chien-thang-dan-lang')
  } finally {
    await table.close()
  }
})
