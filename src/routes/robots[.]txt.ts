import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '#/lib/site'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            '',
            `Sitemap: ${SITE_URL}/sitemap.xml`,
            '',
          ].join('\n'),
          {
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          },
        ),
    },
  },
})
