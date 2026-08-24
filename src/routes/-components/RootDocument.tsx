import type { ReactNode } from 'react'

import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { themeBootstrapScript } from '#/theme/theme'
import { HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ThemeSwitcher } from '#/components/ThemeSwitcher'

export function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html className="antialiased" lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <ThemeSwitcher />
        <TanStackDevtools
          config={{
            position: 'bottom-left',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
