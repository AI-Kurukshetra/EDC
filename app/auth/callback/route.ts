import { NextResponse, type NextRequest } from 'next/server'

import { createServerClient } from '@supabase/ssr'

import { getOptionalPublicEnv } from '@/lib/env'

import type { EmailOtpType } from '@supabase/supabase-js'

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email']

function getSafeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/'
  }

  return raw
}

/** Handles Supabase email-auth redirects for confirmation, magic-link sign-in, and recovery flows. */
export async function GET(request: NextRequest) {
  const env = getOptionalPublicEnv()
  const requestUrl = new URL(request.url)
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'))
  const redirectUrl = new URL(nextPath, request.url)

  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(redirectUrl)
  }

  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.redirect(redirectUrl)

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  if (tokenHash && otpType && OTP_TYPES.includes(otpType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    })

    if (!error) {
      return response
    }
  }

  const errorRedirectUrl = new URL('/login', request.url)
  errorRedirectUrl.searchParams.set('error', 'Unable to verify the authentication link.')

  return NextResponse.redirect(errorRedirectUrl)
}
