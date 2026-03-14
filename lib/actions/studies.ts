'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { CreateStudySchema } from '@/lib/validations/study.schema'

import type { ActionResult } from '@/types/actions'

const StudyCreatorProfileSchema = z.object({
  role: z.enum([
    'sponsor',
    'data_manager',
    'super_admin',
    'investigator',
    'coordinator',
    'monitor',
    'read_only',
  ]),
  is_active: z.boolean(),
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

  if (viewerResult.data?.is_active !== true) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const viewerProfile = StudyCreatorProfileSchema.safeParse(viewerResult.data)

  if (!viewerProfile.success) {
    return { success: false, error: 'Unable to validate your account permissions.' }
  }

  const viewerRole = viewerProfile.data.role

  if (viewerRole !== 'sponsor' && viewerRole !== 'data_manager' && viewerRole !== 'super_admin') {
    return {
      success: false,
      error:
        'You do not have permission to create studies. Ask a sponsor, data manager, or super-admin to create this study.',
    }
  }

  const studyId = crypto.randomUUID()

  const studyResult = await supabase
    .from('studies')
    .insert({
      id: studyId,
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

  if (studyResult.error) {
    if (studyResult.error.message.toLowerCase().includes('row-level security policy')) {
      return {
        success: false,
        error:
          'You do not have permission to create studies. Ask a sponsor, data manager, or super-admin to create this study.',
      }
    }

    return { success: false, error: studyResult.error.message }
  }

  const siteRows = parsed.data.sites.map((site) => ({
    id: crypto.randomUUID(),
    study_id: studyId,
    name: site.name,
    site_code: site.siteCode,
    country: site.country,
    principal_investigator_id: site.principalInvestigatorId ?? null,
    status: 'pending',
  }))

  const sitesResult = await supabase.from('sites').insert(siteRows)

  if (sitesResult.error) {
    return { success: false, error: sitesResult.error.message }
  }

  if (parsed.data.teamAssignments.length > 0) {
    const siteIdByCode = new Map(siteRows.map((site) => [site.site_code, site.id]))
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
      entity_id: studyId,
      old_value: null,
      new_value: parsed.data,
    })
  } catch (error) {
    console.warn('Audit log invocation failed', error)
  }

  revalidatePath('/')
  revalidatePath('/studies')

  return { success: true, data: { id: studyId } }
}
