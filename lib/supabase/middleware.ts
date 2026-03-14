import { NextResponse, type NextRequest } from 'next/server'

import { createServerClient } from '@supabase/ssr'

import { getOptionalPublicEnv } from '@/lib/env'

const AUTH_ROUTES = ['/login', '/register']
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/auth/callback']
const ADMIN_ROUTE_PREFIX = '/admin'
const STUDY_CREATE_ROUTE = '/studies/new'

export async function updateSession(request: NextRequest) {
  const env = getOptionalPublicEnv()

  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

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

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  const isAdminRoute = pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  const isStudyCreateRoute = pathname === STUDY_CREATE_ROUTE

  if (user && (isAdminRoute || isStudyCreateRoute)) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || profile.is_active !== true) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.delete('redirectTo')
      return NextResponse.redirect(redirectUrl)
    }

    if (isAdminRoute && profile.role !== 'super_admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.delete('redirectTo')
      return NextResponse.redirect(redirectUrl)
    }

    if (
      isStudyCreateRoute &&
      !['sponsor', 'data_manager', 'super_admin'].includes(profile.role)
    ) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/studies'
      redirectUrl.searchParams.delete('redirectTo')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}
