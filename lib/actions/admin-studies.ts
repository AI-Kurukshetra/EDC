'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { UpdateAdminStudyGovernanceSchema } from '@/lib/validations/admin-study.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_STATUSES, USER_ROLES, type StudyStatus } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const StudySponsorRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
  status: z.enum(STUDY_STATUSES),
})

const SponsorTargetSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

function formatStudyStatus(status: StudyStatus) {
  return status.replaceAll('_', ' ')
}

/** Updates sponsor ownership and status for a study from the admin workspace. */
export async function updateAdminStudyGovernance(
  raw: unknown,
): Promise<ActionResult<{ studyId: string; sponsorId: string; status: StudyStatus }>> {
  const parsed = UpdateAdminStudyGovernanceSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid study governance update request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage study ownership.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, studyResult, sponsorResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase
      .from('studies')
      .select('id, title, sponsor_id, status')
      .eq('id', parsed.data.studyId)
      .single(),
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', parsed.data.sponsorId)
      .single(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (sponsorResult.error) {
    return { success: false, error: sponsorResult.error.message }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudySponsorRowSchema.safeParse(studyResult.data)
  const sponsor = SponsorTargetSchema.safeParse(sponsorResult.data)

  if (!viewer.success || !study.success || !sponsor.success) {
    return { success: false, error: 'Unable to validate the requested study governance change.' }
  }

  if (viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return { success: false, error: 'Only active super-admin users can update study governance.' }
  }

  if (!sponsor.data.is_active || !['sponsor', 'super_admin'].includes(sponsor.data.role)) {
    return {
      success: false,
      error: 'The new study owner must be an active sponsor-capable user.',
    }
  }

  const hasSponsorChange = study.data.sponsor_id !== sponsor.data.id
  const hasStatusChange = study.data.status !== parsed.data.status

  if (!hasSponsorChange && !hasStatusChange) {
    return { success: false, error: 'No governance changes were provided for this study.' }
  }

  let actionName = 'study.status_updated'
  let notificationTitle = 'Study status updated'
  let notificationMessage = `${study.data.title} is now marked ${formatStudyStatus(parsed.data.status)}. Review study governance and operational follow-up in the dashboard.`

  if (hasSponsorChange && hasStatusChange) {
    actionName = 'study.governance_updated'
    notificationTitle = 'Study ownership reassigned'
    notificationMessage = `You are now the sponsor owner for ${study.data.title}. The study status is now ${formatStudyStatus(parsed.data.status)}. Review governance, assignments, and exports in the dashboard.`
  } else if (hasSponsorChange) {
    actionName = 'study.sponsor_reassigned'
    notificationTitle = 'Study ownership reassigned'
    notificationMessage = `You are now the sponsor owner for ${study.data.title}. Review study governance, assignments, and exports in the dashboard.`
  }

  const updateResult = await supabase
    .from('studies')
    .update({
      sponsor_id: sponsor.data.id,
      status: parsed.data.status,
    })
    .eq('id', study.data.id)
    .select('id')
    .single()

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  try {
    await invokeEdgeFunction('send-notification', {
      user_id: sponsor.data.id,
      type: 'task',
      title: notificationTitle,
      message: notificationMessage,
      entity_id: study.data.id,
      priority: 'normal',
    })
  } catch (error) {
    console.warn('Study reassignment notification failed', error)
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: actionName,
      entity_type: 'study',
      entity_id: study.data.id,
      old_value: {
        sponsor_id: study.data.sponsor_id,
        status: study.data.status,
      },
      new_value: {
        sponsor_id: sponsor.data.id,
        status: parsed.data.status,
      },
      metadata: {
        study_title: study.data.title,
        new_sponsor_email: sponsor.data.email,
      },
    })
  } catch (error) {
    console.warn('Study reassignment audit log failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')
  revalidatePath('/studies')
  revalidatePath(`/studies/${study.data.id}`)

  return {
    success: true,
    data: {
      studyId: study.data.id,
      sponsorId: sponsor.data.id,
      status: parsed.data.status,
    },
  }
}
