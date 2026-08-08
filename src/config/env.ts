import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
})

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export function getServerEnv() {
  return serverEnvSchema.parse(process.env)
}

export function getPublicEnv() {
  return publicEnvSchema.parse(import.meta.env)
}
