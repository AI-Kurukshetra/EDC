'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { ProvisionAdminUserSchema } from '@/lib/validations/admin-provision-user.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const SiteAssignmentTargetSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
})

/** Provisions a new platform user account and optionally assigns the user to a site. */
export async function provisionAdminUser(
  raw: unknown,
): Promise<ActionResult<{ userId: string; email: string }>> {
  const parsed = ProvisionAdminUserSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid user provisioning request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to provision platform users.' }
  }

  const supabase = await getServerSupabase()
  const viewerResult = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)

  if (!viewer.success) {
    return { success: false, error: 'Unable to validate your admin session.' }
  }

  if (viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return { success: false, error: 'Only active super-admin users can provision accounts.' }
  }

  let siteTarget: z.infer<typeof SiteAssignmentTargetSchema> | null = null

  if (parsed.data.siteId) {
    const siteResult = await supabase
      .from('sites')
      .select('id, name')
      .eq('id', parsed.data.siteId)
      .single()

    if (siteResult.error) {
      return { success: false, error: siteResult.error.message }
    }

    siteTarget = SiteAssignmentTargetSchema.parse(siteResult.data)
  }

  const adminSupabase = getAdminSupabase()
  const createUserResult = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      requested_role: parsed.data.role,
    },
  })

  if (createUserResult.error) {
    return {
      success: false,
      error: createUserResult.error.message,
    }
  }

  const newUserId = createUserResult.data.user.id

  const profileUpsertResult = await adminSupabase.from('profiles').upsert(
    {
      id: newUserId,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (profileUpsertResult.error) {
    return { success: false, error: profileUpsertResult.error.message }
  }

  if (siteTarget && parsed.data.siteRole) {
    const siteAssignmentResult = await adminSupabase.from('site_users').insert({
      site_id: siteTarget.id,
      user_id: newUserId,
      role: parsed.data.siteRole,
    })

    if (siteAssignmentResult.error) {
      return { success: false, error: siteAssignmentResult.error.message }
    }
  }

  try {
    await invokeEdgeFunction('send-notification', {
      user_id: newUserId,
      type: 'announcement',
      title: 'Your platform account is ready',
      message: siteTarget
        ? `An administrator created your Clinical Data Hub account and assigned you to site ${siteTarget.name}. Sign in with the temporary password shared out of band and update your credentials.`
        : 'An administrator created your Clinical Data Hub account. Sign in with the temporary password shared out of band and update your credentials.',
      priority: 'normal',
    })
  } catch (error) {
    console.warn('Welcome notification delivery failed', error)
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'profile.provisioned',
      entity_type: 'profile',
      entity_id: newUserId,
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role,
        site_id: parsed.data.siteId ?? null,
        site_role: parsed.data.siteRole ?? null,
      },
    })
  } catch (error) {
    console.warn('Provisioning audit log invocation failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')

  return {
    success: true,
    data: {
      userId: newUserId,
      email: parsed.data.email,
    },
  }
}
