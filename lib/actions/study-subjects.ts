'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  CreateStudySubjectSchema,
  UpdateStudySubjectSchema,
} from '@/lib/validations/study-subject.schema'
import { SUBJECT_STATUSES, USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  subject_id: z.string(),
  status: z.enum(SUBJECT_STATUSES),
  consent_date: z.string().nullable(),
  enrollment_date: z.string().nullable(),
  withdrawal_date: z.string().nullable(),
  withdrawal_reason: z.string().nullable(),
})

const SiteMembershipSchema = z.object({
  id: PostgresUuidSchema,
})

const InsertedSubjectSchema = z.object({
  id: PostgresUuidSchema,
})

function canManageStudySubjects(options: {
  siteMembership: { success: boolean } | null
  studySponsorId: string
  viewer: z.infer<typeof ViewerProfileSchema>
}) {
  return (
    options.viewer.id === options.studySponsorId ||
    options.viewer.role === 'super_admin' ||
    options.viewer.role === 'data_manager' ||
    options.siteMembership?.success === true
  )
}

/** Enrolls a new study subject into the roster for an allowed study site. */
export async function createStudySubject(
  raw: unknown,
): Promise<ActionResult<{ subjectId: string; studyId: string }>> {
  const parsed = CreateStudySubjectSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid subject enrollment request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to enroll a subject.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, studyResult, siteResult, siteMembershipResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase.from('studies').select('id, title, sponsor_id').eq('id', parsed.data.studyId).maybeSingle(),
    supabase
      .from('sites')
      .select('id, study_id, name, site_code')
      .eq('id', parsed.data.siteId)
      .maybeSingle(),
    supabase
      .from('site_users')
      .select('id')
      .eq('site_id', parsed.data.siteId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (siteResult.error) {
    return { success: false, error: siteResult.error.message }
  }

  if (siteMembershipResult.error) {
    return { success: false, error: siteMembershipResult.error.message }
  }

  if (!studyResult.data || !siteResult.data) {
    return { success: false, error: 'The selected study site could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudyRowSchema.safeParse(studyResult.data)
  const site = SiteRowSchema.safeParse(siteResult.data)
  const siteMembership = siteMembershipResult.data
    ? SiteMembershipSchema.safeParse(siteMembershipResult.data)
    : null

  if (!viewer.success || !study.success || !site.success || (siteMembership && !siteMembership.success)) {
    return { success: false, error: 'Unable to validate the study subject context.' }
  }

  if (site.data.study_id !== study.data.id) {
    return { success: false, error: 'The selected site does not belong to this study.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  if (
    !canManageStudySubjects({
      siteMembership,
      studySponsorId: study.data.sponsor_id,
      viewer: viewer.data,
    })
  ) {
    return { success: false, error: 'You do not have permission to enroll subjects at this site.' }
  }

  const insertResult = await supabase
    .from('subjects')
    .insert({
      study_id: study.data.id,
      site_id: site.data.id,
      subject_id: parsed.data.subjectId,
      status: parsed.data.status,
      consent_date: parsed.data.consentDate ?? null,
      enrollment_date: parsed.data.enrollmentDate ?? null,
    })
    .select('id')
    .single()

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      return {
        success: false,
        error: 'This subject identifier already exists for the selected study.',
      }
    }

    return { success: false, error: insertResult.error.message }
  }

  const insertedSubject = InsertedSubjectSchema.safeParse(insertResult.data)

  if (!insertedSubject.success) {
    return { success: false, error: 'Unable to validate the saved subject record.' }
  }

  if (study.data.sponsor_id !== viewer.data.id) {
    try {
      await invokeEdgeFunction('send-notification', {
        user_id: study.data.sponsor_id,
        type: 'task',
        title: 'New subject enrolled',
        message: `${parsed.data.subjectId} was added to ${study.data.title} at ${site.data.site_code}.`,
        entity_id: insertedSubject.data.id,
        priority: 'normal',
      })
    } catch (error) {
      console.warn('Study subject notification failed', error)
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'subject.enrolled',
      entity_type: 'subject',
      entity_id: insertedSubject.data.id,
      metadata: {
        study_id: study.data.id,
        study_title: study.data.title,
        site_id: site.data.id,
        site_code: site.data.site_code,
        subject_label: parsed.data.subjectId,
        status: parsed.data.status,
      },
    })
  } catch (error) {
    console.warn('Study subject audit log failed', error)
  }

  revalidatePath(`/studies/${study.data.id}`)
  revalidatePath(`/studies/${study.data.id}/subjects`)
  revalidatePath(`/studies/${study.data.id}/data`)
  revalidatePath(`/studies/${study.data.id}/audit`)
  revalidatePath('/studies')
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      subjectId: insertedSubject.data.id,
      studyId: study.data.id,
    },
  }
}

/** Updates lifecycle status and dates for an existing study subject. */
export async function updateStudySubject(
  raw: unknown,
): Promise<ActionResult<{ subjectId: string; studyId: string }>> {
  const parsed = UpdateStudySubjectSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid subject update request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to update a subject.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, studyResult, subjectResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase.from('studies').select('id, title, sponsor_id').eq('id', parsed.data.studyId).maybeSingle(),
    supabase
      .from('subjects')
      .select(
        'id, study_id, site_id, subject_id, status, consent_date, enrollment_date, withdrawal_date, withdrawal_reason',
      )
      .eq('id', parsed.data.subjectId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message }
  }

  if (!studyResult.data || !subjectResult.data) {
    return { success: false, error: 'The selected subject could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudyRowSchema.safeParse(studyResult.data)
  const subject = SubjectRowSchema.safeParse(subjectResult.data)

  if (!viewer.success || !study.success || !subject.success) {
    return { success: false, error: 'Unable to validate the study subject context.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  if (subject.data.study_id !== study.data.id) {
    return { success: false, error: 'The selected subject does not belong to this study.' }
  }

  const siteMembershipResult = await supabase
    .from('site_users')
    .select('id')
    .eq('site_id', subject.data.site_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (siteMembershipResult.error) {
    return { success: false, error: siteMembershipResult.error.message }
  }

  const siteMembership = siteMembershipResult.data
    ? SiteMembershipSchema.safeParse(siteMembershipResult.data)
    : null

  if (siteMembership && !siteMembership.success) {
    return { success: false, error: 'Unable to validate your site access for this subject.' }
  }

  if (
    !canManageStudySubjects({
      siteMembership,
      studySponsorId: study.data.sponsor_id,
      viewer: viewer.data,
    })
  ) {
    return { success: false, error: 'You do not have permission to update this subject.' }
  }

  const updateResult = await supabase
    .from('subjects')
    .update({
      status: parsed.data.status,
      consent_date: parsed.data.consentDate ?? null,
      enrollment_date: parsed.data.enrollmentDate ?? null,
      withdrawal_date: parsed.data.status === 'withdrawn' ? parsed.data.withdrawalDate ?? null : null,
      withdrawal_reason:
        parsed.data.status === 'withdrawn' ? parsed.data.withdrawalReason ?? null : null,
    })
    .eq('id', subject.data.id)
    .select('id')
    .single()

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'subject.updated',
      entity_type: 'subject',
      entity_id: subject.data.id,
      old_value: {
        status: subject.data.status,
        consent_date: subject.data.consent_date,
        enrollment_date: subject.data.enrollment_date,
        withdrawal_date: subject.data.withdrawal_date,
        withdrawal_reason: subject.data.withdrawal_reason,
      },
      new_value: {
        status: parsed.data.status,
        consent_date: parsed.data.consentDate ?? null,
        enrollment_date: parsed.data.enrollmentDate ?? null,
        withdrawal_date: parsed.data.status === 'withdrawn' ? parsed.data.withdrawalDate ?? null : null,
        withdrawal_reason:
          parsed.data.status === 'withdrawn' ? parsed.data.withdrawalReason ?? null : null,
      },
      metadata: {
        study_id: study.data.id,
        study_title: study.data.title,
        subject_label: subject.data.subject_id,
      },
    })
  } catch (error) {
    console.warn('Study subject update audit log failed', error)
  }

  revalidatePath(`/studies/${study.data.id}`)
  revalidatePath(`/studies/${study.data.id}/subjects`)
  revalidatePath(`/studies/${study.data.id}/data`)
  revalidatePath(`/studies/${study.data.id}/audit`)
  revalidatePath('/studies')
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      subjectId: subject.data.id,
      studyId: study.data.id,
    },
  }
}
