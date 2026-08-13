import type { ORPCContext } from '../context'

import { implement, os } from '@orpc/server'

import { appContract } from '../contracts'

// eslint-disable-next-line @typescript-eslint/unbound-method
export const middleware = os.middleware

export const baseRouter = implement(appContract).$context<ORPCContext>()
