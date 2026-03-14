import { createClient } from '@supabase/supabase-js'

import { getSupabaseServerEnv } from '@/lib/env'

export function getAdminSupabase() {
  const env = getSupabaseServerEnv()

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
