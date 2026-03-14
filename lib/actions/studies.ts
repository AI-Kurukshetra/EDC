'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { CreateStudySchema } from '@/lib/validations/study.schema'

import type { ActionResult } from '@/types/actions'

const CreatedStudySchema = z.object({
  id: PostgresUuidSchema,
})

const CreatedSiteSchema = z.object({
  id: PostgresUuidSchema,
  site_code: z.string(),
})

function flattenErrors(result: {
  error: { flatten: () => { fieldErrors: Record<string, string[]> } }
}) {
  return result.error.flatten().fieldErrors
}

export async function createStudy(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateStudySchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: flattenErrors(parsed) }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to create a study.' }
  }

  const supabase = await getServerSupabase()
  const viewerResult = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (viewerResult.error) {
    return { success: false, error: 'Unable to validate your account permissions.' }
  }

  if (!viewerResult.data || viewerResult.data.is_active !== true) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  if (!['sponsor', 'data_manager', 'super_admin'].includes(viewerResult.data.role)) {
    return {
      success: false,
      error:
        'You do not have permission to create studies. Ask a sponsor, data manager, or super-admin to create this study.',
    }
  }

  const studyResult = await supabase
    .from('studies')
    .insert({
      title: parsed.data.title,
      protocol_number: parsed.data.protocolNumber,
      phase: parsed.data.phase,
      description: parsed.data.description ?? null,
      sponsor_id: user.id,
      status: 'draft',
      therapeutic_area: parsed.data.therapeuticArea ?? null,
      target_enrollment: parsed.data.targetEnrollment ?? null,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
    })
    .select('id')
    .single()

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  const parsedStudy = CreatedStudySchema.safeParse(studyResult.data)

  if (!parsedStudy.success) {
    return { success: false, error: 'Unable to create study.' }
  }

  const siteRows = parsed.data.sites.map((site) => ({
    study_id: parsedStudy.data.id,
    name: site.name,
    site_code: site.siteCode,
    country: site.country,
    principal_investigator_id: site.principalInvestigatorId ?? null,
    status: 'pending',
  }))

  const sitesResult = await supabase.from('sites').insert(siteRows).select('id, site_code')

  if (sitesResult.error) {
    return { success: false, error: sitesResult.error.message }
  }

  const parsedSites = CreatedSiteSchema.array().safeParse(sitesResult.data)

  if (!parsedSites.success) {
    return { success: false, error: 'Unable to create study sites.' }
  }

  if (parsed.data.teamAssignments.length > 0) {
    const siteIdByCode = new Map(parsedSites.data.map((site) => [site.site_code, site.id]))
    const siteAssignments: {
      site_id: string
      user_id: string
      role: string
    }[] = []

    for (const assignment of parsed.data.teamAssignments) {
      const siteId = siteIdByCode.get(assignment.siteCode)

      if (!siteId) {
        return {
          success: false,
          error: 'Every team assignment must reference a site created in step two.',
        }
      }

      siteAssignments.push({
        site_id: siteId,
        user_id: assignment.userId,
        role: assignment.role,
      })
    }

    const { error: assignmentError } = await supabase.from('site_users').insert(siteAssignments)

    if (assignmentError) {
      return { success: false, error: assignmentError.message }
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: user.id,
      action: 'study.created',
      entity_type: 'study',
      entity_id: parsedStudy.data.id,
      old_value: null,
      new_value: parsed.data,
    })
  } catch (error) {
    console.warn('Audit log invocation failed', error)
  }

  revalidatePath('/')
  revalidatePath('/studies')

  return { success: true, data: { id: parsedStudy.data.id } }
}
