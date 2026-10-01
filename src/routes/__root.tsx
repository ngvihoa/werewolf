import { createRootRoute } from '@tanstack/react-router'
import interCss from '@fontsource-variable/inter/index.css?url'

import appCss from '../styles.css?url'

import { RootDocument } from './-components/RootDocument'
import { NotFound } from './-components/NotFound'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Werewolf Moderator',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: interCss,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})
