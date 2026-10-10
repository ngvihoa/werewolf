import type { TablePlayer, TestTable } from './table'
import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { castTableVote } from './table'

// ===== Kịch bản chơi thật (e2e/scenarios/) =====
// Helpers cấp "đạo diễn": mỗi hàm ứng với một hành động thật của Quản trò hoặc
// người chơi trên UI. Chuỗi nhãn khớp cứng với component (labels.ts,
// NightActionProxyForm, ResolutionControl, VoteMonitor…) — đổi UI phải đổi cả
// kịch bản, đó chính là điểm của e2e mô phỏng luồng thật.

// Nhãn vai — trùng `roleLabel` ở src/game/presentation/labels.ts. Không import
// thẳng từ src để e2e không phụ thuộc path-alias của app.
export const ROLE_LABELS = {
  VILLAGER: 'Dân làng',
  WEREWOLF: 'Ma sói',
  ALPHA_WEREWOLF: 'Sói Đầu Đàn',
  WHITE_WOLF: 'Sói Trắng',
  HYBRID_WOLF: 'Sói Lai',
  SEER: 'Tiên tri',
  WITCH: 'Phù thủy',
  PROTECTOR: 'Bảo vệ',
  HUNTER: 'Thợ săn',
  ELDER: 'Già làng',
  FOOL: 'Thằng ngốc',
  PIPER: 'Người thổi sáo',
  CUPID: 'Thần tình yêu',
  COURTESAN: 'Kỹ nữ',
} as const

export type ScenarioRole = keyof typeof ROLE_LABELS

// Banner kết cục — trùng GameOver.tsx / GameOverResult.tsx
// (winnerDisplayName + " chiến thắng").
export const WIN_BANNERS = {
  VILLAGE: 'Phe Dân làng chiến thắng',
  WEREWOLF: 'Phe Ma sói chiến thắng',
  WHITE_WOLF: 'Sói Trắng chiến thắng',
  FOOL: 'Thằng ngốc chiến thắng',
  PIPER: 'Người thổi sáo chiến thắng',
  LOVERS: 'Cặp tình nhân chiến thắng',
} as const

export type WinnerName = keyof typeof WIN_BANNERS

// ===== Dàn vai CUSTOM trong sảnh chờ =====

// Sảnh chờ → "Cách chọn vai" → "Tự chọn vai": tick từng vai theo danh sách.
// Lưu ý engine (role-assignment.ts): thiếu Sói so với composition mặc định sẽ
// được đổ thêm Ma sói, chỗ trống còn lại lấp bằng Dân làng — kịch bản phải
// chọn đủ số vai bằng số người chơi để composition đúng như kịch bản.
export async function assignCustomComposition(
  table: TestTable,
  roles: readonly ScenarioRole[],
): Promise<void> {
  const page = table.moderator.page
  await page.getByRole('radio', { name: 'Tự chọn vai' }).check()
  for (const role of roles) {
    await page
      .getByRole('checkbox', { name: `Chọn ${ROLE_LABELS[role]}` })
      .check()
  }
  await expect(
    page.getByText(`${roles.length}/${table.players.length} đã chọn`),
  ).toBeVisible()
}

// Đọc dàn vai từ god-view roster — parser bền: nhận diện NHÃN VAI (khớp exact
// một trong ROLE_LABELS) trong từng listitem rồi lấy dòng còn lại làm tên,
// bỏ qua dòng badge số thứ tự ("01") và trạng thái ("Đã chết"/"Đã rời").
// Parser cũ (table.ts findRoleOwners) lấy dòng đầu làm tên — gãy khi token
// game-view render badge trước tên, khiến vai dán nhầm người.
const STATUS_LABELS = new Set(['Đã chết', 'Đã rời'])

export async function readRoleOwners(
  moderatorPage: Page,
): Promise<Map<string, string[]>> {
  const roleValues: Set<string> = new Set(Object.values(ROLE_LABELS))
  const map = new Map<string, string[]>()
  const items = moderatorPage.getByRole('listitem')
  const count = await items.count()
  for (let index = 0; index < count; index += 1) {
    const lines = (await items.nth(index).innerText())
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const roleLine = lines.find((line) => roleValues.has(line))
    if (!roleLine) continue
    const nameLine = lines.find(
      (line) =>
        line !== roleLine && !/^\d+$/.test(line) && !STATUS_LABELS.has(line),
    )
    if (!nameLine) continue
    const owners = map.get(roleLine) ?? []
    if (!owners.includes(nameLine)) owners.push(nameLine)
    map.set(roleLine, owners)
  }
  return map
}

// Đọc dàn vai, chờ tới khi ĐỦ các nhãn vai mong muốn xuất hiện — panel vừa
// vào đêm có thể đang refetch, roster đọc sớm bị thiếu dòng.
export async function waitForRoleOwners(
  moderatorPage: Page,
  roleLabels: readonly string[],
): Promise<Map<string, string[]>> {
  let roles: Map<string, string[]> = new Map()
  await expect(async () => {
    roles = await readRoleOwners(moderatorPage)
    const missing = roleLabels.filter((label) => !roles.get(label)?.length)
    if (missing.length > 0) {
      throw new Error(`Roster is missing: ${missing.join(', ')}`)
    }
  }).toPass({ timeout: 20_000 })
  return roles
}

// ===== Pattern nền chung (page nền trong test không refetch đáng tin) =====

// Click trên panel Quản trò: trang refetch liên tục nên click thường xuyên
// bị kẹt ở kiểm tra actionability (element unstable/bị đè), còn evaluate
// el.click() lại no-op khi element handle đã stale sau re-render. Giải pháp:
// dispatchEvent — re-resolve element TƯƠI tại thời điểm dispatch, bắn sự kiện
// thẳng vào node sống — kèm giới hạn 5s để không treo khi element unmount.
export async function clickPanel(_page: Page, locator: Locator): Promise<void> {
  await Promise.race([
    locator.dispatchEvent('click').catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ])
}

export async function reloadUntilVisible(
  page: Page,
  locate: () => Locator,
  timeout: number,
): Promise<void> {
  await expect(async () => {
    await page.reload()
    await expect(locate()).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout })
}

// ===== Đêm: proxy & skip (MODERATED) =====

// Phù thủy có form riêng (checkbox bình cứu + picker bình độc) — không đi qua
// proxyNightStep vì hành động không phải "chọn một mục tiêu".
export async function proxyWitchStep(
  moderatorPage: Page,
  options: { heal?: boolean; poisonTargetName?: string },
): Promise<void> {
  const submitLabel = 'Ghi nhận lựa chọn của Phù thủy'
  const form = moderatorPage.locator('form').filter({
    has: moderatorPage.getByRole('button', { name: submitLabel, exact: true }),
  })
  if (options.heal) {
    await form
      .getByRole('checkbox', { name: 'Dùng bình cứu cho nạn nhân Sói' })
      .check()
  }
  if (options.poisonTargetName) {
    await form
      .getByRole('button', { name: options.poisonTargetName, exact: true })
      .click()
  }
  const submit = form.getByRole('button', { name: submitLabel, exact: true })
  await submit.click()
  await expect(submit).toBeHidden()
}

// Sói Đầu Đàn cắn xuyên bảo vệ: tick checkbox một-lần rồi chọn mục tiêu như
// thường. Checkbox chỉ hiện khi enhancedAttackAvailable còn nguyên.
export async function proxyAlphaEnhancedStep(
  moderatorPage: Page,
  targetName: string,
): Promise<void> {
  const submitLabel = 'Ghi nhận lựa chọn của Ma sói'
  const form = moderatorPage.locator('form').filter({
    has: moderatorPage.getByRole('button', { name: submitLabel, exact: true }),
  })
  await form
    .getByRole('checkbox', { name: 'Cắn xuyên bảo vệ (Sói Đầu Đàn)' })
    .check()
  await form.getByRole('button', { name: targetName, exact: true }).click()
  const submit = form.getByRole('button', { name: submitLabel, exact: true })
  await submit.click()
  await expect(submit).toBeHidden()
}

// Bỏ qua bước đang gọi với lý do (bắt buộc). Nếu đây là bước cuối của đêm,
// panel hàng đợi nhường chỗ cho bảng "Kết quả dự kiến" — chấp nhận một trong
// hai bằng chứng: nhãn "Bỏ qua" tăng thêm ít nhất 1, hoặc đêm đã giải quyết.
export async function skipNightStep(
  moderatorPage: Page,
  reason: string,
): Promise<void> {
  const before = await moderatorPage
    .getByText('Bỏ qua', { exact: true })
    .count()
  await moderatorPage.getByLabel('Bỏ qua bước với lý do').fill(reason)
  // Panel quản trò có thanh submit sticky đè vùng click khi form proxy dài —
  // click thường bị kẹt ở kiểm tra actionability; bắn sự kiện trực tiếp qua
  // dispatchEvent (không nhận options timeout) và tự giới hạn 5s: bước có thể
  // vừa được giải quyết khiến nút skip unmount giữa chừng.
  await boundedDispatch(
    moderatorPage.getByRole('button', { name: 'Bỏ qua lượt này' }),
  )
  await expect(async () => {
    const skipped = await moderatorPage
      .getByText('Bỏ qua', { exact: true })
      .count()
    const resolved = await moderatorPage
      .getByText('Kết quả dự kiến')
      .isVisible()
      .catch(() => false)
    if (resolved || skipped >= before + 1) return
    throw new Error('Skip not recorded yet')
  }).toPass({ timeout: 25_000 })
}

// dispatchEvent không có tham số timeout — bọc Promise.race để không chờ
// element vô hạn khi nó unmount giữa chừng.
async function boundedDispatch(locator: Locator): Promise<void> {
  await Promise.race([
    locator.dispatchEvent('click').catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ])
}

// Bỏ qua lần lượt từng bước đêm cho tới khi bước mong muốn ĐANG GỌI (dùng
// khi kịch bản cần proxy 1 bước giữa các bước bỏ qua). Chờ theo HÀNG ĐỢI
// (li[aria-current="step"] + nhãn bước + trạng thái "Đang gọi") thay vì nút
// submit — nút submit đổi tên thành "Đang cập nhật..." khi panel pending.
// queueStepText là nhãn bước trong hàng đợi (labels.ts queueStepLabel),
// vd "Ma sói tấn công", "Phù thủy hành động".
export async function skipUntilStep(
  moderatorPage: Page,
  queueStepText: string,
  reason: string,
  maxSteps = 9,
): Promise<void> {
  const activeItem = moderatorPage
    .locator('li[aria-current="step"]')
    .filter({ hasText: queueStepText })
    .filter({ hasText: 'Đang gọi' })
  for (let step = 0; step < maxSteps; step += 1) {
    const appeared = await activeItem
      .waitFor({ state: 'visible', timeout: 6_000 })
      .then(() => true)
      .catch(() => false)
    if (appeared) return
    const dump = await moderatorPage
      .locator('main')
      .innerText()
      .catch(() => '(no main)')
    await import('node:fs/promises').then((fs) =>
      fs.appendFile(
        '/tmp/s08-debug.log',
        `=== cycle ${step} ===\n${dump.slice(0, 1800)}\n`,
      ),
    )
    const resolved = await moderatorPage
      .getByText('Kết quả dự kiến')
      .waitFor({ state: 'visible', timeout: 4_000 })
      .then(() => true)
      .catch(() => false)
    if (resolved) {
      throw new Error(
        `Night resolved before step "${queueStepText}" could be proxied`,
      )
    }
    // Nút skip còn thì skip; vắng thì RELOAD — panel không tự refetch đáng tin
    // (realtime/polling kém tin), đứng chờ sẽ nhìn DOM cũ mãi mãi.
    const canSkip = await moderatorPage
      .getByRole('button', { name: 'Bỏ qua lượt này' })
      .isVisible()
      .catch(() => false)
    if (canSkip) {
      await skipNightStep(moderatorPage, reason)
    } else {
      await moderatorPage.reload()
    }
  }
  throw new Error(
    `Step "${queueStepText}" did not appear after ${maxSteps} skips`,
  )
}

// Bỏ qua lần lượt từng bước tới khi đêm được giải quyết. Tín hiệu "đã giải
// quyết" KHÔNG phải chờ chữ "Kết quả dự kiến" (panel refetch chậm, chữ có thể
// tới sau 5s) — nút skip unmount là bằng chứng tức thời đêm đã xong.
export async function skipUntilNightResolution(
  moderatorPage: Page,
  reason: string,
  maxSteps = 9,
): Promise<void> {
  for (let step = 0; step < maxSteps; step += 1) {
    const resolved = await moderatorPage
      .getByText('Kết quả dự kiến')
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
    if (resolved) return
    // Nút skip còn thì skip; vắng thì RELOAD — panel không tự refetch đáng tin
    // (realtime/polling kém tin), đứng chờ sẽ nhìn DOM cũ mãi mãi.
    const canSkip = await moderatorPage
      .getByRole('button', { name: 'Bỏ qua lượt này' })
      .isVisible()
      .catch(() => false)
    if (canSkip) {
      await skipNightStep(moderatorPage, reason)
    } else {
      await moderatorPage.reload()
    }
  }
  await expect(moderatorPage.getByText('Kết quả dự kiến')).toBeVisible()
}

// ===== Bình minh =====

export async function expectDawnDeaths(
  moderatorPage: Page,
  names: readonly string[],
): Promise<void> {
  const resolution = moderatorPage.getByText('Kết quả dự kiến').locator('..')
  if (names.length === 0) {
    await expect(
      resolution.getByText('Không ai bị loại trong đêm này'),
    ).toBeVisible()
    return
  }
  for (const name of names) {
    await expect(resolution.getByText(name)).toBeVisible()
  }
}

export async function expectDawnHybridConversion(
  moderatorPage: Page,
  name: string,
): Promise<void> {
  const card = moderatorPage.getByText('Chuyển hóa bí mật').locator('..')
  await expect(card).toBeVisible()
  await expect(card.getByText(name)).toBeVisible()
}

// Công bố bình minh. Điểm thắng kiểm NGAY sau công bố: nếu ván kết thúc ở
// bình minh (Sói chết hết / phe khác đủ điều kiện) thì ngày không mở — truyền
// `gameOver` để assert banner kết cục thay vì heading mở thảo luận.
export async function announceDawn(
  moderatorPage: Page,
  options: { gameOver?: WinnerName } = {},
): Promise<void> {
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('button', {
      name: 'Công bố kết quả và mở ngày',
    }),
  )
  if (options.gameOver) {
    await expectGameOverEventually(moderatorPage, options.gameOver)
    return
  }
  await expect(
    moderatorPage.getByRole('heading', { name: 'Mở thảo luận ban ngày' }),
  ).toBeVisible()
}

// ===== Biểu quyết =====

// Mở biểu quyết từ ngày (M7: gate của quản trò ở MODERATED).
export async function startVote(
  moderatorPage: Page,
  aliveCount: number,
): Promise<void> {
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('button', { name: 'Bắt đầu biểu quyết' }),
  )
  await expect(moderatorPage.getByText(`0/${aliveCount} phiếu`)).toBeVisible()
}

// Mọi người sống bỏ phiếu trên thiết bị của mình (targetName null = phiếu
// trắng). Assert monitor đếm live TRƯỚC lá cuối; lá phiếu cuối chạm đủ "mọi
// người sống đã bỏ" → bot tally trong cùng request và monitor nhường chỗ cho
// gate công bố (bot-moderator.ts: allAliveVoted chạy trước nhánh MODERATED) —
// caller gọi confirmVoteResolution ngay sau hàm này.
// Lá phiếu CUỐI: cùng request đó bot tally, trang người chơi có thể nhảy thẳng
// qua VOTE_RESOLUTION ("Chờ Quản trò công bố") hoặc thẳng GAME_OVER (banner
// kết cục) — chấp nhận cả ba trạng thái thay vì nhất quyết chờ "Đã ghi phiếu".
async function castLastVote(
  voter: TablePlayer,
  targetName: string | null,
): Promise<void> {
  await voter.page.reload()
  if (targetName) {
    await voter.page
      .getByRole('button', { name: targetName, exact: true })
      .click()
  } else {
    await voter.page.getByLabel(/Bỏ phiếu trắng/).check()
  }
  const submit = voter.page.getByRole('button', { name: 'Ghi phiếu' })
  await submit.click()
  await expect(
    voter.page
      .getByText('Đã ghi phiếu của bạn')
      .or(voter.page.getByText('Chờ Quản trò công bố'))
      .or(voter.page.getByRole('heading', { name: /chiến thắng/ })),
  ).toBeVisible({ timeout: 10_000 })
}

export async function deviceVoteAll(
  moderatorPage: Page,
  votes: readonly { voter: TablePlayer; targetName: string | null }[],
): Promise<void> {
  const aliveCount = votes.length
  const [last, ...rest] = votes
  if (!last) throw new Error('deviceVoteAll requires at least one vote')
  for (const { voter, targetName } of rest) {
    await castTableVote(voter, targetName ?? undefined)
  }
  await reloadUntilVisible(
    moderatorPage,
    () => moderatorPage.getByText(`${aliveCount - 1}/${aliveCount} phiếu`),
    30_000,
  )
  await castLastVote(last.voter, last.targetName)
}

// Gate công bố kết quả biểu quyết của quản trò — dùng cho cả đường vote thiết
// bị (auto-tally rồi chờ xác nhận) lẫn đường đếm tay (manualTally gọi sẵn).
// Sau tally, panel refetch: nút xác nhận có lúc pending-disabled ("Đang cập
// nhật...") — reload-poll, chờ enable rồi bấm, và kiểm tra panel đã rời
// VOTE_RESOLUTION thay vì chỉ tin nút biến mất (tên nút đổi khi pending).
export async function confirmVoteResolution(
  moderatorPage: Page,
): Promise<void> {
  // KHÔNG dùng waitFor('detached') làm tín hiệu "đã xác nhận" — nó trả về
  // TRUE ngay cả khi panel chưa từng render (refetch trễ) khiến helper tự
  // thoát mà chưa bấm gì. Trình tự đúng: chờ nút XUẤT HIỆN (reload-poll) →
  // bấm → reload-poll tới khi nút biến mất (phase đã tiến).
  const confirm = moderatorPage.getByRole('button', {
    name: 'Xác nhận kết quả',
  })
  await reloadUntilVisible(moderatorPage, () => confirm, 30_000)
  await expect(confirm).toBeEnabled({ timeout: 10_000 })
  await clickPanel(moderatorPage, confirm)
  await expect(async () => {
    await moderatorPage.reload()
    await expect(confirm).toHaveCount(0)
  }).toPass({ timeout: 30_000 })
}

// Đếm tay dự phòng (M6): mở <details>, chọn người bị loại, ghi nhận rồi xác
// nhận. Dùng để dàn thế nhanh khi lá phiếu không thuộc cốt truyện.
export async function manualTally(
  moderatorPage: Page,
  targetName: string,
): Promise<void> {
  await clickPanel(
    moderatorPage,
    moderatorPage.getByText('Nhập kết quả đếm tay (dự phòng)'),
  )
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('button', { name: targetName, exact: true }),
  )
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('button', {
      name: 'Ghi nhận kết quả biểu quyết',
    }),
  )
  await confirmVoteResolution(moderatorPage)
}

// Ngày bế tắc: đếm tay với "Kết quả hòa" rồi bỏ qua lượt 2 (SKIP_REVOTE) —
// không ai bị loại, ván về đêm. Đây là đường hợp pháp duy nhất để một ngày
// không có loại trừ.
export async function manualTallyTied(moderatorPage: Page): Promise<void> {
  await clickPanel(
    moderatorPage,
    moderatorPage.getByText('Nhập kết quả đếm tay (dự phòng)'),
  )
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('checkbox', { name: 'Kết quả hòa' }),
  )
  await clickPanel(
    moderatorPage,
    moderatorPage.getByRole('button', {
      name: 'Ghi nhận kết quả biểu quyết',
    }),
  )
  const skipRevote = moderatorPage.getByRole('button', {
    name: 'Xác nhận hòa và bỏ qua lần 2',
  })
  await reloadUntilVisible(moderatorPage, () => skipRevote, 30_000)
  await clickPanel(moderatorPage, skipRevote)
  await expect(skipRevote).toBeHidden()
}

// ===== Thợ săn =====

// Bắn qua thiết bị của Thợ săn: chọn mục tiêu, gửi, rồi quản trò xác nhận
// phát bắn trên panel của mình (trang nền phải reload-poll).
export async function hunterShoot(
  hunter: TablePlayer,
  targetName: string,
  moderatorPage: Page,
): Promise<void> {
  await hunter.page.reload()
  await hunter.page
    .getByRole('button', { name: targetName, exact: true })
    .click()
  const submit = hunter.page.getByRole('button', {
    name: 'Gửi mục tiêu cho Quản trò',
  })
  await submit.click()
  await expect(submit).toBeHidden()

  const confirmShot = moderatorPage.getByRole('button', {
    name: 'Xác nhận phát bắn',
  })
  await reloadUntilVisible(moderatorPage, () => confirmShot, 30_000)
  await confirmShot.click()
  await expect(confirmShot).toBeHidden()
}

// ===== Kết cục =====

export async function expectGameOver(
  page: Page,
  banner: WinnerName,
): Promise<void> {
  // Role heading để không trúng dòng cùng tên trong "Lịch sử ván chơi".
  await expect(
    page.getByRole('heading', { name: WIN_BANNERS[banner] }),
  ).toBeVisible()
}

// Bản reload-poll cho assert kết cục trên trang có thể kẹt loading — dùng cho
// assert cuối cùng sau chuỗi reload (trang refresh vừa rồi có thể dính hang).
export async function expectGameOverEventually(
  page: Page,
  banner: WinnerName,
): Promise<void> {
  await reloadUntilVisible(
    page,
    () => page.getByRole('heading', { name: WIN_BANNERS[banner] }),
    45_000,
  )
}

// Hàng đợi đêm cũng render listitem chứa tên + nhãn vai (token chủ vai) —
// lọc thêm nhãn "Đã chết" để chỉ khớp item roster; reload-poll vì trang nền
// không refetch đáng tin.
export async function expectPlayerDead(
  moderatorPage: Page,
  name: string,
): Promise<void> {
  await expect(async () => {
    await moderatorPage.reload()
    await expect(
      moderatorPage
        .getByRole('listitem')
        .filter({ hasText: name })
        .filter({ hasText: 'Đã chết' })
        .first(),
    ).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
}
