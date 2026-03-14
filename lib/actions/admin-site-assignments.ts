'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import {
  AssignAdminUserSiteSchema,
  RemoveAdminUserSiteAssignmentSchema,
} from '@/lib/validations/admin-site-assignment.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES, type UserRole } from '@/types'

import type { ActionResult } from '@/types/actions'

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

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
})

const SiteAssignmentRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
})

type ValidatedAdminViewerResult =
  | {
      error: string
      viewer: null
      supabase: null
    }
  | {
      error: null
      viewer: z.infer<typeof ViewerProfileSchema>
      supabase: Awaited<ReturnType<typeof getServerSupabase>>
    }

async function getValidatedAdminViewer(): Promise<ValidatedAdminViewerResult> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return {
      error: 'You must be signed in to manage site access.',
      viewer: null,
      supabase: null,
    } as const
  }

  const supabase = await getServerSupabase()
  const viewerResult = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .single()

  if (viewerResult.error) {
    return {
      error: viewerResult.error.message,
      viewer: null,
      supabase: null,
    } as const
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)

  if (!viewer.success || viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return {
      error: 'Only active super-admin users can manage site assignments.',
      viewer: null,
      supabase: null,
    } as const
  }

  return {
    error: null,
    viewer: viewer.data,
    supabase,
  } as const
}

function buildAssignmentNotificationMessage(input: {
  isUpdate: boolean
  role: UserRole
  siteCode: string
  studyTitle: string
}) {
  const roleLabel = input.role.replaceAll('_', ' ')

  if (input.isUpdate) {
    return `Your site access for ${input.siteCode} in ${input.studyTitle} was updated. Your assigned site role is now ${roleLabel}.`
  }

  return `You were assigned to site ${input.siteCode} in ${input.studyTitle} with the site role ${roleLabel}.`
}

/** Creates or updates a site assignment for a user from the admin workspace. */
export async function assignAdminUserSite(
  raw: unknown,
): Promise<ActionResult<{ userId: string; siteId: string; role: UserRole }>> {
  const parsed = AssignAdminUserSiteSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid site assignment request.' }
  }

  const adminContext = await getValidatedAdminViewer()

  if (adminContext.error !== null) {
    return { success: false, error: adminContext.error }
  }

  const { supabase, viewer } = adminContext
  const [targetResult, siteResult, existingAssignmentResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, is_active')
      .eq('id', parsed.data.userId)
      .single(),
    supabase
      .from('sites')
      .select('id, study_id, name, site_code')
      .eq('id', parsed.data.siteId)
      .single(),
    supabase
      .from('site_users')
      .select('id, user_id, site_id, role')
      .eq('user_id', parsed.data.userId)
      .eq('site_id', parsed.data.siteId)
      .maybeSingle(),
  ])

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message }
  }

  if (siteResult.error) {
    return { success: false, error: siteResult.error.message }
  }

  if (existingAssignmentResult.error) {
    return { success: false, error: existingAssignmentResult.error.message }
  }

  const target = TargetProfileSchema.safeParse(targetResult.data)
  const site = SiteRowSchema.safeParse(siteResult.data)
  const existingAssignment = existingAssignmentResult.data
    ? SiteAssignmentRowSchema.safeParse(existingAssignmentResult.data)
    : null

  if (!target.success || !site.success || (existingAssignment && !existingAssignment.success)) {
    return { success: false, error: 'Unable to validate the requested site assignment change.' }
  }

  const studyResult = await supabase
    .from('studies')
    .select('id, title')
    .eq('id', site.data.study_id)
    .single()

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  const study = StudyRowSchema.safeParse(studyResult.data)

  if (!study.success) {
    return { success: false, error: 'Unable to validate the target study for this site.' }
  }

  const previousRole = existingAssignment ? existingAssignment.data.role : null
  const isUpdate = previousRole !== null

  if (previousRole === parsed.data.role) {
    return { success: false, error: 'This user already has that role for the selected site.' }
  }

  const upsertResult = await supabase
    .from('site_users')
    .upsert(
      {
        site_id: site.data.id,
        user_id: target.data.id,
        role: parsed.data.role,
      },
      { onConflict: 'site_id,user_id' },
    )
    .select('id')
    .single()

  if (upsertResult.error) {
    return { success: false, error: upsertResult.error.message }
  }

  try {
    await invokeEdgeFunction('send-notification', {
      user_id: target.data.id,
      type: 'task',
      title: isUpdate ? 'Site role updated' : 'Site access assigned',
      message: buildAssignmentNotificationMessage({
        isUpdate,
        role: parsed.data.role,
        siteCode: site.data.site_code,
        studyTitle: study.data.title,
      }),
      entity_id: site.data.id,
      priority: 'normal',
    })
  } catch (error) {
    console.warn('Site assignment notification failed', error)
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.id,
      action: isUpdate ? 'site.assignment_updated' : 'site.assignment_created',
      entity_type: 'site_user',
      entity_id: upsertResult.data.id,
      old_value: {
        role: previousRole,
      },
      new_value: {
        role: parsed.data.role,
      },
      metadata: {
        assigned_user_email: target.data.email,
        site_code: site.data.site_code,
        study_title: study.data.title,
      },
    })
  } catch (error) {
    console.warn('Site assignment audit log failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')
  revalidatePath('/studies')
  revalidatePath(`/studies/${study.data.id}`)

  return {
    success: true,
    data: {
      userId: target.data.id,
      siteId: site.data.id,
      role: parsed.data.role,
    },
  }
}

/** Removes a site assignment from a user from the admin workspace. */
export async function removeAdminUserSiteAssignment(
  raw: unknown,
): Promise<ActionResult<{ assignmentId: string; userId: string }>> {
  const parsed = RemoveAdminUserSiteAssignmentSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid site assignment removal request.' }
  }

  const adminContext = await getValidatedAdminViewer()

  if (adminContext.error !== null) {
    return { success: false, error: adminContext.error }
  }

  const { supabase, viewer } = adminContext
  const assignmentResult = await supabase
    .from('site_users')
    .select('id, user_id, site_id, role')
    .eq('id', parsed.data.assignmentId)
    .single()

  if (assignmentResult.error) {
    return { success: false, error: assignmentResult.error.message }
  }

  const assignment = SiteAssignmentRowSchema.safeParse(assignmentResult.data)

  if (!assignment.success) {
    return { success: false, error: 'Unable to validate the requested site assignment.' }
  }

  const [targetResult, siteResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, is_active')
      .eq('id', assignment.data.user_id)
      .single(),
    supabase
      .from('sites')
      .select('id, study_id, name, site_code')
      .eq('id', assignment.data.site_id)
      .single(),
  ])

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message }
  }

  if (siteResult.error) {
    return { success: false, error: siteResult.error.message }
  }

  const target = TargetProfileSchema.safeParse(targetResult.data)
  const site = SiteRowSchema.safeParse(siteResult.data)

  if (!target.success || !site.success) {
    return { success: false, error: 'Unable to validate the site assignment removal request.' }
  }

  const studyResult = await supabase
    .from('studies')
    .select('id, title')
    .eq('id', site.data.study_id)
    .single()

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  const study = StudyRowSchema.safeParse(studyResult.data)

  if (!study.success) {
    return { success: false, error: 'Unable to validate the study tied to this assignment.' }
  }

  const deleteResult = await supabase.from('site_users').delete().eq('id', assignment.data.id)

  if (deleteResult.error) {
    return { success: false, error: deleteResult.error.message }
  }

  try {
    await invokeEdgeFunction('send-notification', {
      user_id: target.data.id,
      type: 'alert',
      title: 'Site access removed',
      message: `Your access to site ${site.data.site_code} in ${study.data.title} was removed by platform administration.`,
      entity_id: site.data.id,
      priority: 'normal',
    })
  } catch (error) {
    console.warn('Site assignment removal notification failed', error)
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.id,
      action: 'site.assignment_removed',
      entity_type: 'site_user',
      entity_id: assignment.data.id,
      old_value: {
        role: assignment.data.role,
      },
      new_value: null,
      metadata: {
        removed_user_email: target.data.email,
        site_code: site.data.site_code,
        study_title: study.data.title,
      },
    })
  } catch (error) {
    console.warn('Site assignment removal audit log failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')
  revalidatePath('/studies')
  revalidatePath(`/studies/${study.data.id}`)

  return {
    success: true,
    data: {
      assignmentId: assignment.data.id,
      userId: target.data.id,
    },
  }
}
