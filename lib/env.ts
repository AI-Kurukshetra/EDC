import { z } from 'zod'

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const SupabaseServerEnvSourceSchema = PublicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_PROJECT_REF: z.string().min(1),
}).superRefine((value, context) => {
  if (value.SUPABASE_SERVICE_ROLE_KEY ?? value.SUPABASE_SECRET_KEY) {
    return
  }

  context.addIssue({
    code: 'custom',
    path: ['SUPABASE_SERVICE_ROLE_KEY'],
    message: 'Provide SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY',
  })
})

const ResendEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_AUDIENCE_EMAIL: z.email(),
})

const OptionalPublicEnvSchema = PublicEnvSchema.partial()

export type PublicAppEnv = z.infer<typeof PublicEnvSchema>
export type ResendEnv = z.infer<typeof ResendEnvSchema>
type OptionalPublicAppEnv = z.infer<typeof OptionalPublicEnvSchema>
export type SupabaseServerEnv = PublicAppEnv & {
  SUPABASE_PROJECT_REF: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

let cachedPublicEnv: PublicAppEnv | null = null
let cachedSupabaseServerEnv: SupabaseServerEnv | null = null
let cachedResendEnv: ResendEnv | null = null

export function getPublicEnv(): PublicAppEnv {
  if (cachedPublicEnv) return cachedPublicEnv

  cachedPublicEnv = PublicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  })

  return cachedPublicEnv
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  if (cachedSupabaseServerEnv) return cachedSupabaseServerEnv

  const parsedEnv = SupabaseServerEnvSourceSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    SUPABASE_SECRET_KEY: process.env['SUPABASE_SECRET_KEY'],
    SUPABASE_PROJECT_REF: process.env['SUPABASE_PROJECT_REF'],
  })

  cachedSupabaseServerEnv = {
    NEXT_PUBLIC_APP_URL: parsedEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: parsedEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: parsedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      parsedEnv.SUPABASE_SERVICE_ROLE_KEY ?? parsedEnv.SUPABASE_SECRET_KEY ?? '',
    SUPABASE_PROJECT_REF: parsedEnv.SUPABASE_PROJECT_REF,
  }

  return cachedSupabaseServerEnv
}

export function getResendEnv(): ResendEnv {
  if (cachedResendEnv) return cachedResendEnv

  cachedResendEnv = ResendEnvSchema.parse({
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    RESEND_AUDIENCE_EMAIL: process.env['RESEND_AUDIENCE_EMAIL'],
  })

  return cachedResendEnv
}

export function getOptionalPublicEnv(): OptionalPublicAppEnv | null {
  const parsed = OptionalPublicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  })

  if (!parsed.success) return null

  return parsed.data
}
