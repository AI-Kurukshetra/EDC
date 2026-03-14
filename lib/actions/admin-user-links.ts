'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { z } from 'zod'

import { getPublicEnv } from '@/lib/env'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { GenerateAdminUserAccessLinkSchema } from '@/lib/validations/admin-user-link.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

type AdminUserLinkType = 'magiclink' | 'recovery'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const TargetProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  is_active: z.boolean(),
})

function getCallbackNextPath(linkType: AdminUserLinkType) {
  return linkType === 'recovery' ? '/reset-password' : '/'
}

async function getAccessLinkRedirectUrl(linkType: AdminUserLinkType) {
  const env = getPublicEnv()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? env.NEXT_PUBLIC_APP_URL
  const nextPath = encodeURIComponent(getCallbackNextPath(linkType))

  return `${origin}/auth/callback?next=${nextPath}`
}

/** Generates a one-time sign-in or recovery link for a platform user from the admin workspace. */
export async function generateAdminUserAccessLink(
  raw: unknown,
): Promise<ActionResult<{ link: string; linkType: 'magiclink' | 'recovery'; email: string }>> {
  const parsed = GenerateAdminUserAccessLinkSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid admin access-link request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage access links.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, targetResult] = await Promise.all([
    supabase.from('profiles').select('id, role, is_active').eq('id', user.id).single(),
    supabase
      .from('profiles')
      .select('id, full_name, email, is_active')
      .eq('id', parsed.data.userId)
      .single(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const target = TargetProfileSchema.safeParse(targetResult.data)

  if (!viewer.success || !target.success) {
    return { success: false, error: 'Unable to validate the access-link request.' }
  }

  if (viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return { success: false, error: 'Only active super-admin users can generate access links.' }
  }

  if (!target.data.is_active) {
    return { success: false, error: 'Activate this user before generating access links.' }
  }

  const adminSupabase = getAdminSupabase()
  const redirectTo = await getAccessLinkRedirectUrl(parsed.data.linkType)
  const generateResult = await adminSupabase.auth.admin.generateLink({
    type: parsed.data.linkType,
    email: target.data.email,
    options: {
      redirectTo,
    },
  })

  const actionLink = generateResult.data.properties?.action_link ?? null

  if (generateResult.error || !actionLink) {
    return {
      success: false,
      error: generateResult.error?.message ?? 'Unable to generate the requested access link.',
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action:
        parsed.data.linkType === 'recovery'
          ? 'profile.recovery_link_generated'
          : 'profile.magic_link_generated',
      entity_type: 'profile',
      entity_id: target.data.id,
      metadata: {
        email: target.data.email,
        link_type: parsed.data.linkType,
      },
    })
  } catch (error) {
    console.warn('Access-link audit log failed', error)
  }

  revalidatePath('/admin')

  return {
    success: true,
    data: {
      link: actionLink,
      linkType: parsed.data.linkType,
      email: target.data.email,
    },
  }
}
