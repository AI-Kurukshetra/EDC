'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { UpdateAdminUserAccessSchema } from '@/lib/validations/admin-user.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ProfileAccessRowSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

/** Updates a user's platform role and active flag from the super-admin workspace. */
export async function updateAdminUserAccess(
  raw: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = UpdateAdminUserAccessSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid admin access update request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage platform users.' }
  }

  const supabase = await getServerSupabase()

  const [viewerResult, targetResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, is_active').eq('id', user.id).single(),
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', parsed.data.userId)
      .single(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message }
  }

  const viewer = ProfileAccessRowSchema.safeParse(viewerResult.data)
  const target = ProfileAccessRowSchema.safeParse(targetResult.data)

  if (!viewer.success || !target.success) {
    return { success: false, error: 'Unable to validate the requested user access change.' }
  }

  if (viewer.data.role !== 'super_admin') {
    return {
      success: false,
      error: 'Only super-admin users can change platform access.',
    }
  }

  if (
    target.data.id === viewer.data.id &&
    (parsed.data.role !== target.data.role || parsed.data.isActive !== target.data.is_active)
  ) {
    return {
      success: false,
      error: 'You cannot change your own platform role or deactivate your own account.',
    }
  }

  const updateResult = await supabase
    .from('profiles')
    .update({
      role: parsed.data.role,
      is_active: parsed.data.isActive,
    })
    .eq('id', parsed.data.userId)
    .select('id')
    .single()

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'profile.access_updated',
      entity_type: 'profile',
      entity_id: parsed.data.userId,
      old_value: {
        role: target.data.role,
        is_active: target.data.is_active,
      },
      new_value: {
        role: parsed.data.role,
        is_active: parsed.data.isActive,
      },
    })
  } catch (error) {
    console.warn('Audit log invocation failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')

  return {
    success: true,
    data: {
      userId: parsed.data.userId,
    },
  }
}
