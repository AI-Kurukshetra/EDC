import { cookies } from 'next/headers'

import { createServerClient } from '@supabase/ssr'

import { getPublicEnv } from '@/lib/env'

export async function getServerSupabase() {
  const cookieStore = await cookies()
  const env = getPublicEnv()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}

export async function getAuthenticatedUser() {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.getUser()

  if (error) return null

  return data.user
}
