import { createClient } from '@supabase/supabase-js'
import { getPublicEnv } from '#/config/env'

let browserClient: ReturnType<typeof createClient> | undefined

export function getSupabaseBrowserClient() {
  const env = getPublicEnv()

  browserClient ??= createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
  )

  return browserClient
}
