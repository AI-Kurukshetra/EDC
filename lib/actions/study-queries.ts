'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { UpdateStudyQuerySchema } from '@/lib/validations/study-query.schema'
import { QUERY_PRIORITIES, QUERY_STATUSES, USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const QueryRowSchema = z.object({
  id: PostgresUuidSchema,
  subject_id: PostgresUuidSchema,
  data_entry_id: PostgresUuidSchema,
  query_text: z.string(),
  status: z.enum(QUERY_STATUSES),
  raised_by: PostgresUuidSchema.nullable(),
  assigned_to: PostgresUuidSchema.nullable(),
  priority: z.enum(QUERY_PRIORITIES),
})

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  subject_id: z.string(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const AssigneeProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const ResponseInsertSchema = z.object({
  id: PostgresUuidSchema,
})

const SiteMembershipSchema = z.object({
  id: PostgresUuidSchema,
})

/** Records a study-query response and/or triage update from the study query workspace. */
export async function updateStudyQuery(
  raw: unknown,
): Promise<ActionResult<{ queryId: string; studyId: string }>> {
  const parsed = UpdateStudyQuerySchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid query update request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to update study queries.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, queryResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase
      .from('queries')
      .select('id, subject_id, data_entry_id, query_text, status, raised_by, assigned_to, priority')
      .eq('id', parsed.data.queryId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (queryResult.error) {
    return { success: false, error: queryResult.error.message }
  }

  if (!queryResult.data) {
    return { success: false, error: 'This query could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const query = QueryRowSchema.safeParse(queryResult.data)

  if (!viewer.success || !query.success) {
    return { success: false, error: 'Unable to validate the query update context.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const [subjectResult, studyResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, study_id, site_id, subject_id')
      .eq('id', query.data.subject_id)
      .maybeSingle(),
    supabase
      .from('studies')
      .select('id, title, sponsor_id')
      .eq('id', parsed.data.studyId)
      .maybeSingle(),
  ])

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (!subjectResult.data || !studyResult.data) {
    return { success: false, error: 'This query is missing its study context.' }
  }

  const subject = SubjectRowSchema.safeParse(subjectResult.data)
  const study = StudyRowSchema.safeParse(studyResult.data)

  if (!subject.success || !study.success) {
    return { success: false, error: 'Unable to validate the query update context.' }
  }

  if (subject.data.study_id !== parsed.data.studyId) {
    return { success: false, error: 'This query does not belong to the requested study.' }
  }

  const canManageQuery =
    viewer.data.role === 'super_admin' ||
    viewer.data.role === 'sponsor' ||
    viewer.data.role === 'data_manager' ||
    viewer.data.role === 'monitor' ||
    viewer.data.role === 'investigator' ||
    viewer.data.role === 'coordinator' ||
    query.data.assigned_to === viewer.data.id

  if (!canManageQuery) {
    return { success: false, error: 'You do not have permission to update this query.' }
  }

  const hasResponseContent = Boolean(parsed.data.responseText ?? parsed.data.actionTaken)
  const isStatusChange = parsed.data.nextStatus !== query.data.status
  const isAssignmentChange = parsed.data.assignedToId !== query.data.assigned_to

  if (!hasResponseContent && !isStatusChange && !isAssignmentChange) {
    return { success: false, error: 'No query changes were provided.' }
  }

  let assignee: z.infer<typeof AssigneeProfileSchema> | null = null

  if (parsed.data.assignedToId) {
    const [assigneeResult, siteMembershipResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .eq('id', parsed.data.assignedToId)
        .maybeSingle(),
      supabase
        .from('site_users')
        .select('id')
        .eq('user_id', parsed.data.assignedToId)
        .eq('site_id', subject.data.site_id)
        .maybeSingle(),
    ])

    if (assigneeResult.error) {
      return { success: false, error: assigneeResult.error.message }
    }

    if (siteMembershipResult.error) {
      return { success: false, error: siteMembershipResult.error.message }
    }

    if (!assigneeResult.data) {
      return { success: false, error: 'The selected assignee could not be found.' }
    }

    const parsedAssignee = AssigneeProfileSchema.safeParse(assigneeResult.data)
    const siteMembership = siteMembershipResult.data
      ? SiteMembershipSchema.safeParse(siteMembershipResult.data)
      : null

    if (!parsedAssignee.success || (siteMembership && !siteMembership.success)) {
      return { success: false, error: 'Unable to validate the selected assignee.' }
    }

    if (!parsedAssignee.data.is_active) {
      return { success: false, error: 'The selected assignee is inactive.' }
    }

    const isSponsorOwner = parsedAssignee.data.id === study.data.sponsor_id
    const isSiteMember = siteMembership?.success === true

    if (!isSponsorOwner && !isSiteMember) {
      return { success: false, error: 'The selected assignee is not part of this study.' }
    }

    assignee = parsedAssignee.data
  }

  let insertedResponseId: string | null = null

  if (hasResponseContent) {
    const responseInsertResult = await supabase
      .from('query_responses')
      .insert({
        query_id: query.data.id,
        response_text: parsed.data.responseText ?? parsed.data.actionTaken ?? 'Query updated',
        responded_by: viewer.data.id,
        action_taken: parsed.data.actionTaken ?? null,
      })
      .select('id')
      .single()

    if (responseInsertResult.error) {
      return { success: false, error: responseInsertResult.error.message }
    }

    const insertedResponse = ResponseInsertSchema.safeParse(responseInsertResult.data)

    if (!insertedResponse.success) {
      return { success: false, error: 'Unable to validate the saved query response.' }
    }

    insertedResponseId = insertedResponse.data.id
  }

  const updateResult = await supabase
    .from('queries')
    .update({
      status: parsed.data.nextStatus,
      assigned_to: parsed.data.assignedToId,
    })
    .eq('id', query.data.id)
    .select('id')
    .single()

  if (updateResult.error) {
    if (insertedResponseId) {
      await supabase.from('query_responses').delete().eq('id', insertedResponseId)
    }

    return { success: false, error: updateResult.error.message }
  }

  if (isAssignmentChange && assignee && assignee.id !== viewer.data.id) {
    try {
      await invokeEdgeFunction('send-notification', {
        user_id: assignee.id,
        type: 'task',
        title: 'Query assigned to you',
        message: `${study.data.title} has a query assigned to you for subject ${subject.data.subject_id}.`,
        entity_id: query.data.id,
        priority: query.data.priority === 'high' ? 'high' : 'normal',
      })
    } catch (error) {
      console.warn('Query assignment notification failed', error)
    }
  }

  if (
    hasResponseContent &&
    query.data.raised_by &&
    query.data.raised_by !== viewer.data.id &&
    assignee?.id !== query.data.raised_by
  ) {
    try {
      await invokeEdgeFunction('send-notification', {
        user_id: query.data.raised_by,
        type: 'task',
        title: 'Query response recorded',
        message: `${study.data.title} query activity was recorded for subject ${subject.data.subject_id}. Review the latest response and status update.`,
        entity_id: query.data.id,
        priority: query.data.priority === 'high' ? 'high' : 'normal',
      })
    } catch (error) {
      console.warn('Query response notification failed', error)
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: hasResponseContent ? 'query.responded' : 'query.updated',
      entity_type: 'query',
      entity_id: query.data.id,
      old_value: {
        status: query.data.status,
        assigned_to: query.data.assigned_to,
      },
      new_value: {
        status: parsed.data.nextStatus,
        assigned_to: parsed.data.assignedToId,
      },
      metadata: {
        study_id: study.data.id,
        study_title: study.data.title,
        subject_id: subject.data.id,
        subject_label: subject.data.subject_id,
        data_entry_id: query.data.data_entry_id,
        response_id: insertedResponseId,
        has_response: hasResponseContent,
        response_text: parsed.data.responseText ?? null,
        action_taken: parsed.data.actionTaken ?? null,
      },
    })
  } catch (error) {
    console.warn('Study query audit log failed', error)
  }

  revalidatePath(`/studies/${study.data.id}/queries`)
  revalidatePath(`/studies/${study.data.id}/audit`)
  revalidatePath(`/studies/${study.data.id}/data`)
  revalidatePath(`/studies/${study.data.id}`)
  revalidatePath('/studies')
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      queryId: query.data.id,
      studyId: study.data.id,
    },
  }
}
