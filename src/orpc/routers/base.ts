import type { ORPCContext } from '../context'

import { implement, os } from '@orpc/server'

import { appContract } from '../contracts'

import { sessionTokenGuard } from './middleware'

// eslint-disable-next-line @typescript-eslint/unbound-method
export const middleware = os.middleware

// sessionTokenGuard được đăng ký trên builder gốc nên mọi procedure của mọi
// router con đều đi qua ranh giới kiểm tra định dạng session token này.
export const baseRouter = implement(appContract)
  .$context<ORPCContext>()
  .use(sessionTokenGuard)
