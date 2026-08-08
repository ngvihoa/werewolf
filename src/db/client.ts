import { getServerEnv } from '#/config/env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const connection = postgres(getServerEnv().DATABASE_URL, {
  prepare: false,
  max: 5,
})

export const db = drizzle(connection, { schema })
