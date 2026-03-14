'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { RegisterStudyDocumentSchema } from '@/lib/validations/study-document.schema'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const StudyTargetSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const InsertedDocumentSchema = z.object({
  id: PostgresUuidSchema,
})

/** Registers a study-scoped document record for sponsor and data-management workflows. */
export async function registerStudyDocument(
  raw: unknown,
): Promise<ActionResult<{ documentId: string; studyId: string }>> {
  const parsed = RegisterStudyDocumentSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid study document registration request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to register study documents.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, studyResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase.from('studies').select('id, title, sponsor_id').eq('id', parsed.data.studyId).single(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudyTargetSchema.safeParse(studyResult.data)

  if (!viewer.success || !study.success) {
    return { success: false, error: 'Unable to validate the requested document registration.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const canManageDocuments =
    study.data.sponsor_id === viewer.data.id ||
    viewer.data.role === 'super_admin' ||
    viewer.data.role === 'data_manager'

  if (!canManageDocuments) {
    return {
      success: false,
      error:
        'Only the study sponsor, data managers, or super admins can register study documents.',
    }
  }

  const insertResult = await supabase
    .from('study_documents')
    .insert({
      study_id: study.data.id,
      name: parsed.data.name,
      file_path: parsed.data.filePath,
      version: parsed.data.version,
      uploaded_by: viewer.data.id,
      category: parsed.data.category,
    })
    .select('id')
    .single()

  if (insertResult.error) {
    return { success: false, error: insertResult.error.message }
  }

  const insertedDocument = InsertedDocumentSchema.safeParse(insertResult.data)

  if (!insertedDocument.success) {
    return { success: false, error: 'Unable to validate the saved document record.' }
  }

  if (study.data.sponsor_id !== viewer.data.id) {
    try {
      await invokeEdgeFunction('send-notification', {
        user_id: study.data.sponsor_id,
        type: 'task',
        title: 'New study document registered',
        message: `${parsed.data.name} was added to ${study.data.title} in the study document register.`,
        entity_id: insertedDocument.data.id,
        priority: 'normal',
      })
    } catch (error) {
      console.warn('Study document notification failed', error)
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'study_document.registered',
      entity_type: 'study_document',
      entity_id: insertedDocument.data.id,
      metadata: {
        study_id: study.data.id,
        study_title: study.data.title,
        category: parsed.data.category,
        version: parsed.data.version,
        file_path: parsed.data.filePath,
      },
    })
  } catch (error) {
    console.warn('Study document audit log failed', error)
  }

  revalidatePath(`/studies/${study.data.id}`)
  revalidatePath(`/studies/${study.data.id}/audit`)
  revalidatePath(`/studies/${study.data.id}/documents`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      documentId: insertedDocument.data.id,
      studyId: study.data.id,
    },
  }
}
