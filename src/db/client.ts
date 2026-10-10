import { getServerEnv } from '#/config/env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const connection = postgres(getServerEnv().DATABASE_URL, {
  prepare: false,
  // 5 kết nối bị vắt mũi trong e2e: 7–9 trang poll getGameView song song +
  // mutation + transaction bot xếp hàng chờ pool → request treo hàng chục giây.
  max: 10,
})

export const db = drizzle(connection, { schema })
