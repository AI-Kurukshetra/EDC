'use server'

import { headers } from 'next/headers'

import { getPublicEnv } from '@/lib/env'
import { getServerSupabase } from '@/lib/supabase/server'
import { LoginSchema, MagicLinkSchema, RegisterSchema } from '@/lib/validations/auth.schema'

import type { ActionResult } from '@/types/actions'

function flattenErrors(result: {
  error: { flatten: () => { fieldErrors: Record<string, string[]> } }
}) {
  return result.error.flatten().fieldErrors
}

export async function loginWithPassword(
  raw: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = LoginSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: flattenErrors(parsed) }
  }

  const supabase = await getServerSupabase()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: { redirectTo: '/' } }
}

export async function sendMagicLink(raw: unknown): Promise<ActionResult<string>> {
  const parsed = MagicLinkSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: flattenErrors(parsed) }
  }

  const supabase = await getServerSupabase()
  const env = getPublicEnv()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? env.NEXT_PUBLIC_APP_URL

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: 'Magic link sent. Check your inbox to continue.',
  }
}

export async function registerWithPassword(raw: unknown): Promise<ActionResult<string>> {
  const parsed = RegisterSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: flattenErrors(parsed) }
  }

  const supabase = await getServerSupabase()
  const env = getPublicEnv()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? env.NEXT_PUBLIC_APP_URL

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/`,
      data: {
        full_name: parsed.data.fullName,
        requested_role: parsed.data.role,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: 'Account created. Check your inbox to confirm your email and complete setup.',
  }
}

export async function logout(): Promise<ActionResult<string>> {
  const supabase = await getServerSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: '/login' }
}
