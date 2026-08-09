import type { RouterClient } from '@orpc/server'
import type { AppRouter } from './router'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

const link = new RPCLink({
  url: () => `${window.location.origin}/api/rpc`,
})

export const orpcClient: RouterClient<AppRouter> = createORPCClient(link)
