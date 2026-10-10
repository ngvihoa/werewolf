import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '#/lib/site'

// Sitemap cho các route public tĩnh; route app (/play, /join, /game…) là
// noindex nên không đưa vào.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            `  <url><loc>${SITE_URL}/</loc></url>`,
            `  <url><loc>${SITE_URL}/rules</loc></url>`,
            '</urlset>',
            '',
          ].join('\n'),
          {
            headers: { 'content-type': 'application/xml; charset=utf-8' },
          },
        ),
    },
  },
})
