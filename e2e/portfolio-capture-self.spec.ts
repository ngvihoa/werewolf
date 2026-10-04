import type { SelfTable, TablePlayer } from './fixtures/table'
import type { Locator, Page } from '@playwright/test'

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { createSelfTable, selfParticipants } from './fixtures/table'

// Kịch bản "đạo diễn" chế độ SELF (không quản trò): 5 người chơi trọn một ván
// qua UI thật và chụp lại mọi thay đổi mới để user duyệt — form tạo phòng với
// selector luật hòa (Rev 6), lobby không quản trò (R24), đêm tự xác nhận,
// thảo luận + consent (R21), bỏ phiếu trên thiết bị (R20), màn kết quả +
// rematch (T7). Ảnh lưu captures/self-mode-<ngày>/; các khung đắt giá nhất có
// cả bản desktop 1600 và mobile 390 (setViewportSize, không cần bàn thứ hai).
// Chạy: pnpm test:capture e2e/portfolio-capture-self.spec.ts

const OUT_DIR = join(process.cwd(), 'captures/self-mode-2026-10-04')

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

// Submit hành động đêm sau khi target ĐÃ được chọn để chụp — KHÔNG bấm lại
// target: chạm lần nữa là bỏ chọn (toggle), nút submit thành disabled và
// click chờ vô hạn.
async function submitSelectedAction(player: TablePlayer): Promise<void> {
  await player.page.getByRole('button', { name: 'Gửi hành động' }).click()
  await expect(
    player.page.getByRole('button', { name: 'Gửi hành động' }),
  ).toBeHidden()
}

// Consent kèm xác minh "Bạn đã sẵn sàng" (consent bị STALE đánh rơi sẽ bấm
// lại ở vòng reload kế).
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

// Bỏ phiếu kèm xác minh; chấp nhận nhảy thẳng GAME_OVER (phiếu cuối trigger
// tally trong cùng request — "Sự thật được lộ ra" chỉ màn kết quả có).
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
    await expect(done.or(gameOver)).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 90_000 })
}

test('SELF: đạo diễn ván 5 người và chụp mọi khoảnh khắc mới', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  mkdirSync(OUT_DIR, { recursive: true })

  // ===== Màn entry: menu + form tạo phòng (không tốn slot player) =====
  const viewerContext = await browser.newContext(CAMERA_CONTEXT)
  const viewer = await viewerContext.newPage()
  await viewer.goto('/play')
  await expect(
    viewer.getByRole('button', { name: /Không quản trò/ }),
  ).toBeVisible()
  await shoot(viewer, '01-entry-menu')
  await viewer.getByRole('button', { name: /Không quản trò/ }).click()
  await expect(viewer.getByLabel('Tên của bạn')).toBeVisible()
  await viewer.getByLabel('Tên của bạn').fill('Mai Phương')
  await shootBoth(viewer, '02-tao-phong-tu-choi-luat-hoa')
  await viewerContext.close()

  // ===== Bàn thật 5 người =====
  const table: SelfTable = await createSelfTable(
    browser,
    5,
    {
      hostName: 'Mai Phương',
      playerNames: ['Tuấn Kiệt', 'Bảo Ngọc', 'Hải Đăng', 'Kim Chi'],
    },
    CAMERA_CONTEXT,
  )

  try {
    const lastPlayer = table.players[table.players.length - 1]
    if (!lastPlayer) throw new Error('Players are missing')
    await expect(lastPlayer.page.getByText('Đang chờ chủ phòng')).toBeVisible()
    await expect(table.host.page.getByText('5 / 15')).toBeVisible()

    // Lobby: góc nhìn người chơi chờ + góc nhìn chủ phòng.
    await shoot(lastPlayer.page, '03-lobby-cho-chu-phong')
    await shoot(table.host.page, '04-lobby-chu-phong')

    // Phân vai + thẻ vai Ma sói (flip card ở sảnh chờ).
    await table.host.page
      .getByRole('button', { name: 'Xáo và phân vai' })
      .click()
    await expect(
      table.host.page.getByRole('button', { name: 'Xáo và phân lại vai' }),
    ).toBeVisible()

    let wolf: TablePlayer | null = null
    for (const player of [table.host, ...table.players]) {
      const flip = player.page.getByRole('button', { name: 'Xem thẻ vai' })
      await expect(flip).toBeVisible()
      await flip.click()
      const isWolf =
        (await player.page
          .getByText('Ma sói', { exact: true })
          .first()
          .isVisible()
          .catch(() => false)) ?? false
      if (isWolf) {
        wolf = player
        break
      }
      await player.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()
    }
    if (!wolf) throw new Error('No wolf was assigned')
    await shoot(wolf.page, '05-the-vai-ma-soi')
    await wolf.page.getByRole('button', { name: 'Ẩn thẻ vai' }).click()

    // Cả bàn sẵn sàng → nút bắt đầu sáng.
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
    await shoot(table.host.page, '06-lobby-san-sang-bat-dau')
    await start.click()
    await expect(table.host.page).toHaveURL(/\/game$/)

    // ===== Đêm 1 =====
    const participants = selfParticipants(table)
    const seer = await findFirstByRole(participants, 'Tiên tri')
    const confirmedWolf = await findFirstByRole(participants, 'Ma sói')
    const villagers = await findAllByRole(participants, 'Dân làng')
    expect(villagers).toHaveLength(3)
    const inspectTarget = villagers[0]
    const attackTarget = villagers[1]
    if (!inspectTarget || !attackTarget) {
      throw new Error('Composition is missing villagers')
    }

    // Tiên tri: form chọn mục tiêu (copy SELF "Gửi hành động").
    await reloadUntilVisible(
      seer.page,
      () => seer.page.getByRole('button', { name: 'Gửi hành động' }),
      30_000,
    )
    await seer.page
      .getByRole('button', { name: inspectTarget.name, exact: true })
      .click()
    await shoot(seer.page, '07-dem-tien-tri-chon')
    await submitSelectedAction(seer)

    // Xác nhận tự động (không còn "Quản trò sẽ xem xét").
    await expect(seer.page.getByText('Hệ thống xác nhận tự động')).toBeVisible()
    await shoot(seer.page, '08-dem-tien-tri-da-gui')

    // Dân làng: khoảng chờ đêm + countdown ngữ cảnh (R22).
    const witness = villagers[2]
    if (!witness) throw new Error('Third villager is missing')
    await reloadUntilVisible(
      witness.page,
      () => witness.page.getByText('Giữ im lặng và chờ lượt'),
      30_000,
    )
    await shoot(witness.page, '09-dem-dan-lang-cho')

    // Sói cắn một dân làng → bot confirm → sang ngày.
    await reloadUntilVisible(
      confirmedWolf.page,
      () => confirmedWolf.page.getByRole('button', { name: 'Gửi hành động' }),
      30_000,
    )
    await confirmedWolf.page
      .getByRole('button', { name: attackTarget.name, exact: true })
      .click()
    await shoot(confirmedWolf.page, '10-dem-soi-chon')
    await submitSelectedAction(confirmedWolf)

    // ===== Ngày: thảo luận tối thiểu + consent (R21/R22) =====
    const consent = (page: Page) =>
      page.getByRole('button', { name: 'Sẵn sàng bỏ phiếu' })
    await reloadUntilVisible(
      confirmedWolf.page,
      () => consent(confirmedWolf.page),
      60_000,
    )
    await expect(
      confirmedWolf.page.getByText('Thảo luận tối thiểu'),
    ).toBeVisible()
    await shootBoth(confirmedWolf.page, '11-ngay-thao-luan-consent')

    // Consent lần lượt; Tiên tri bấm CUỐI để chụp đúng "4/4".
    const alive = participants.filter(
      (player) => player.name !== attackTarget.name,
    )
    for (const player of alive) {
      if (player.name === seer.name) continue
      await consentAndVerify(player)
    }
    await consentAndVerify(seer)
    // Consent cuối có thể mở biểu quyết ngay (deadline thảo luận 30s đã qua
    // khi cả bàn bấm xong) — khung "Bạn đã sẵn sàng" chỉ chụp khi còn kịp;
    // trễ thì khung biểu quyết (13) đã phản ánh bước tiếp theo.
    const readyNow = await seer.page
      .getByText('Bạn đã sẵn sàng')
      .first()
      .isVisible()
      .catch(() => false)
    if (readyNow) {
      await shoot(seer.page, '12-ngay-da-san-sang')
    }

    // ===== Biểu quyết trên thiết bị (R20) =====
    const ballot = (page: Page) =>
      page.getByRole('button', { name: 'Bỏ phiếu', exact: true })
    await reloadUntilVisible(
      confirmedWolf.page,
      () => ballot(confirmedWolf.page),
      120_000,
    )

    const voters = alive.filter((player) => player.name !== confirmedWolf.name)
    const firstVoter = voters[0]
    const secondVoter = voters[1]
    const thirdVoter = voters[2]
    if (!firstVoter || !secondVoter || !thirdVoter) {
      throw new Error('Voters are missing')
    }

    // Khung biểu quyết với mục tiêu đã chọn (dân vote Sói). Click ngay sau
    // reload có thể rơi trước hydration (nút hiện từ SSR HTML nhưng chưa có
    // handler) → click bị nuốt, chụp ra trạng thái chưa chọn. Nên sau click
    // PHẢI thấy nút "Bỏ phiếu" bật sáng (disabled={!targetId}) rồi mới chụp.
    await expect(async () => {
      await firstVoter.page.reload()
      const ballotButton = firstVoter.page
        .getByRole('button', { name: 'Bỏ phiếu', exact: true })
        .first()
      await expect(ballotButton).toBeVisible({ timeout: 8_000 })
      await firstVoter.page
        .getByRole('button', { name: confirmedWolf.name, exact: true })
        .click()
      await expect(ballotButton).toBeEnabled({ timeout: 5_000 })
    }).toPass({ timeout: 90_000 })
    await shootBoth(firstVoter.page, '13-bieu-quyet-chon')
    await voteAndVerify(firstVoter, confirmedWolf.name)

    // Lá thứ hai: count công khai "2/4 người đã bỏ phiếu".
    await voteAndVerify(secondVoter, confirmedWolf.name)
    await reloadUntilVisible(
      secondVoter.page,
      () => secondVoter.page.getByText('Đã ghi phiếu của bạn'),
      30_000,
    )
    await shoot(secondVoter.page, '14-bieu-quyet-da-ghi')

    // Hai lá cuối — lá cuối trigger tally ngay trong request.
    await voteAndVerify(thirdVoter, confirmedWolf.name)
    await voteAndVerify(confirmedWolf, seer.name)

    // ===== Kết thúc: phe Dân làng thắng + rematch (T7) =====
    await reloadUntilVisible(
      table.host.page,
      () => table.host.page.getByText('Phe Dân làng chiến thắng'),
      60_000,
    )
    await shootBoth(table.host.page, '15-ket-thuc-dan-lang-thang')

    const rematch = table.host.page.getByRole('button', {
      name: 'Chơi ván mới cùng phòng',
    })
    await rematch.scrollIntoViewIfNeeded()
    await shoot(table.host.page, '16-chu-phong-choi-van-moi')

    await reloadUntilVisible(
      lastPlayer.page,
      () => lastPlayer.page.getByText('Chủ phòng sẽ mở ván mới'),
      60_000,
    )
    await lastPlayer.page
      .getByText('Chủ phòng sẽ mở ván mới')
      .scrollIntoViewIfNeeded()
    await shoot(lastPlayer.page, '17-nguoi-choi-cho-van-moi')
  } finally {
    await table.close()
  }
})
