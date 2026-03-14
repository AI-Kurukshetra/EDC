'use client'

import { createBrowserClient } from '@supabase/ssr'

import { getPublicEnv } from '@/lib/env'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

type BrowserSupabaseClient = SupabaseClient<Database>

type BrowserCookieOptions = {
  domain?: string
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none' | boolean
  secure?: boolean
}

let client: BrowserSupabaseClient | null = null

function getAllBrowserCookies() {
  if (document.cookie.trim() === '') {
    return []
  }

  return document.cookie.split('; ').map((cookie) => {
    const separatorIndex = cookie.indexOf('=')
    const name = separatorIndex === -1 ? cookie : cookie.slice(0, separatorIndex)
    const value = separatorIndex === -1 ? '' : cookie.slice(separatorIndex + 1)

    return {
      name: decodeURIComponent(name),
      value: decodeURIComponent(value),
    }
  })
}

function setAllBrowserCookies(
  cookies: {
    name: string
    value: string
    options: BrowserCookieOptions
  }[],
) {
  cookies.forEach(({ name, value, options }) => {
    const segments = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `Path=${options.path ?? '/'}`,
    ]

    if (options.maxAge !== undefined) {
      segments.push(`Max-Age=${String(options.maxAge)}`)
    }

    if (options.domain) {
      segments.push(`Domain=${options.domain}`)
    }

    if (options.sameSite && options.sameSite !== true) {
      segments.push(`SameSite=${options.sameSite}`)
    }

    if (options.secure) {
      segments.push('Secure')
    }

    document.cookie = segments.join('; ')
  })
}

export function getBrowserSupabase() {
  if (client) {
    return client
  }

  const env = getPublicEnv()

  client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: getAllBrowserCookies,
        setAll: setAllBrowserCookies,
      },
    },
  )

  return client
}
