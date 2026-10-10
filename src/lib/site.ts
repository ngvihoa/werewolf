// Địa chỉ gốc của site, dùng cho canonical, OG, sitemap và JSON-LD.
// Có thể ghi đè bằng biến build VITE_SITE_URL; fallback là domain production
// trên Vercel. Khi đổi domain, sửa ở đây (robots.txt/sitemap.xml đều đọc
// chung SITE_URL nên không cần sửa thêm).
const CONFIGURED_SITE_URL = import.meta.env.VITE_SITE_URL as string | undefined

export const SITE_URL = (
  CONFIGURED_SITE_URL ?? 'https://werewolf-moderator.vercel.app'
).replace(/\/+$/, '')

export const SITE_NAME = 'Moonveil'

export const OG_IMAGE_PATH = '/og.jpg'

// Định vị 2 chế độ chơi (Phase 13): tự chơi online không Quản trò, hoặc
// chơi tại bàn có Quản trò điều phối — dùng chung cho meta và JSON-LD.
export const SITE_DESCRIPTION =
  'Chơi Ma Sói trực tuyến trọn vẹn: mở phòng tự chơi — hệ thống điều phối từng lượt thay Quản trò — hoặc chơi tại bàn với Quản trò điều phối trên màn hình riêng. 5–15 người chơi, 14 vai trò.'

export const OG_IMAGE_ALT = 'Moonveil — Ma Sói trực tuyến'

type JsonLdObject = Record<string, unknown>

export type PublicHeadInput = {
  /** Đường dẫn public dùng cho canonical và og:url, ví dụ '/' hoặc '/rules'. */
  path: string
  title: string
  description: string
  jsonLd?: JsonLdObject | JsonLdObject[]
}

/**
 * Head đầy đủ cho route public: title, description, canonical, Open Graph,
 * Twitter card và JSON-LD (tuỳ chọn). Route app (game/lobby…) KHÔNG dùng
 * helper này — chúng nhận noindex từ head của route gốc.
 */
export function publicHead({
  path,
  title,
  description,
  jsonLd,
}: PublicHeadInput) {
  const url = `${SITE_URL}${path}`
  const image = `${SITE_URL}${OG_IMAGE_PATH}`

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'vi_VN' },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: OG_IMAGE_ALT },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    links: [{ rel: 'canonical', href: url }],
    ...(jsonLd
      ? {
          scripts: [
            {
              type: 'application/ld+json',
              children: JSON.stringify(jsonLd),
            },
          ],
        }
      : {}),
  }
}

/** Meta noindex mặc định cho route app — route gốc gắn sẵn, route app nhắc lại tường minh. */
export const NOINDEX_ROBOTS = [{ name: 'robots', content: 'noindex, nofollow' }]

/** JSON-LD mô tả Moonveil là ứng dụng web chơi Ma Sói, gắn ở landing. */
export function webAppJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    image: `${SITE_URL}${OG_IMAGE_PATH}`,
    inLanguage: 'vi-VN',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
    featureList: [
      'Tự chơi không cần Quản trò — hệ thống điều phối từng lượt',
      'Chơi tại bàn với Quản trò điều phối trên màn hình riêng',
      'Vai trò và lượt hành động bí mật trên từng thiết bị',
      '5–15 người chơi, 14 vai trò',
    ],
  }
}

/** JSON-LD FAQPage từ câu hỏi hiển thị thật trên trang luật chơi. */
export function faqJsonLd(
  faqs: readonly { question: string; answer: string }[],
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
