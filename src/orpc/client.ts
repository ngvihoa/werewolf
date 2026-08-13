import type { ContractRouterClient } from '@orpc/contract'
import type { AppContract } from './types'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

const link = new RPCLink({
  url: () => `${window.location.origin}/api/rpc`,
})

export const orpcClient: ContractRouterClient<AppContract> =
  createORPCClient(link)
