'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { RequestStudyExportSchema } from '@/lib/validations/study-export.schema'

import type { ActionResult } from '@/types/actions'

const StudyExportPermissionRowSchema = z.object({
  id: PostgresUuidSchema,
  sponsor_id: PostgresUuidSchema,
})

const ProfileRoleRowSchema = z.object({
  id: PostgresUuidSchema,
  role: z.enum([
    'super_admin',
    'sponsor',
    'investigator',
    'coordinator',
    'monitor',
    'data_manager',
    'read_only',
  ]),
})

const ExportResponseSchema = z.object({
  id: PostgresUuidSchema,
  signed_url: z.url(),
  expires_at: z.string(),
})

type StudyExportRequestResult = {
  id: string
  signedUrl: string
  expiresAt: string
}

/** Requests a signed study-data export for the current user and records the resulting export job. */
export async function requestStudyExport(
  raw: unknown,
): Promise<ActionResult<StudyExportRequestResult>> {
  const parsed = RequestStudyExportSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid export request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to request a study export.' }
  }

  const supabase = await getServerSupabase()

  const [studyResult, profileResult] = await Promise.all([
    supabase.from('studies').select('id, sponsor_id').eq('id', parsed.data.studyId).maybeSingle(),
    supabase.from('profiles').select('id, role').eq('id', user.id).single(),
  ])

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (profileResult.error) {
    return { success: false, error: profileResult.error.message }
  }

  if (!studyResult.data) {
    return { success: false, error: 'Study not found or not accessible.' }
  }

  const study = StudyExportPermissionRowSchema.safeParse(studyResult.data)
  const profile = ProfileRoleRowSchema.safeParse(profileResult.data)

  if (!study.success || !profile.success) {
    return { success: false, error: 'Unable to validate export permissions.' }
  }

  const canRequestExport =
    study.data.sponsor_id === user.id ||
    ['super_admin', 'data_manager', 'monitor'].includes(profile.data.role)

  if (!canRequestExport) {
    return {
      success: false,
      error:
        'Only the study sponsor, monitors, data managers, or super admins can request exports.',
    }
  }

  try {
    const response = await invokeEdgeFunction('export-data', {
      study_id: parsed.data.studyId,
      requested_by: user.id,
      format: parsed.data.format,
    })

    const responseData = ExportResponseSchema.parse(await response.json())

    revalidatePath(`/studies/${parsed.data.studyId}/export`)

    return {
      success: true,
      data: {
        id: responseData.id,
        signedUrl: responseData.signed_url,
        expiresAt: responseData.expires_at,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to request the study export.',
    }
  }
}
