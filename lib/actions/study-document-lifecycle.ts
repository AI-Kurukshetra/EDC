'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  CreateStudyDocumentVersionSchema,
  UpdateStudyDocumentSchema,
} from '@/lib/validations/study-document-lifecycle.schema'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const StudyDocumentContextSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  file_path: z.string(),
  version: z.number().int().positive(),
  category: z.string(),
})

const StudyTargetSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const InsertedDocumentSchema = z.object({
  id: PostgresUuidSchema,
  version: z.number().int().positive(),
})

function canManageStudyDocuments(
  viewer: z.infer<typeof ViewerProfileSchema>,
  study: z.infer<typeof StudyTargetSchema>,
) {
  return (
    viewer.is_active &&
    (study.sponsor_id === viewer.id ||
      viewer.role === 'super_admin' ||
      viewer.role === 'data_manager')
  )
}

async function loadStudyDocumentLifecycleContext(
  studyId: string,
  documentId: string,
  userId: string,
) {
  const supabase = await getServerSupabase()
  const [viewerResult, studyResult, documentResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, is_active').eq('id', userId).single(),
    supabase.from('studies').select('id, title, sponsor_id').eq('id', studyId).single(),
    supabase
      .from('study_documents')
      .select('id, study_id, name, file_path, version, category')
      .eq('id', documentId)
      .eq('study_id', studyId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false as const, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false as const, error: studyResult.error.message }
  }

  if (documentResult.error) {
    return { success: false as const, error: documentResult.error.message }
  }

  if (!documentResult.data) {
    return { success: false as const, error: 'This study document could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudyTargetSchema.safeParse(studyResult.data)
  const document = StudyDocumentContextSchema.safeParse(documentResult.data)

  if (!viewer.success || !study.success || !document.success) {
    return {
      success: false as const,
      error: 'Unable to validate the requested document lifecycle context.',
    }
  }

  if (!canManageStudyDocuments(viewer.data, study.data)) {
    return {
      success: false as const,
      error: 'Only the study sponsor, data managers, or super admins can manage study documents.',
    }
  }

  return {
    success: true as const,
    supabase,
    viewer: viewer.data,
    study: study.data,
    document: document.data,
  }
}

/** Updates metadata for an unsigned study document. Signed records must branch into a new version. */
export async function updateStudyDocument(
  raw: unknown,
): Promise<ActionResult<{ documentId: string; studyId: string }>> {
  const parsed = UpdateStudyDocumentSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid study document update request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to update study documents.' }
  }

  const context = await loadStudyDocumentLifecycleContext(
    parsed.data.studyId,
    parsed.data.documentId,
    user.id,
  )

  if (!context.success) {
    return { success: false, error: context.error }
  }

  const signatureCountResult = await context.supabase
    .from('signatures')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'study_document')
    .eq('entity_id', context.document.id)

  if (signatureCountResult.error) {
    return { success: false, error: signatureCountResult.error.message }
  }

  if ((signatureCountResult.count ?? 0) > 0) {
    return {
      success: false,
      error:
        'Signed study documents are locked. Create a next version instead of editing in place.',
    }
  }

  const updateResult = await context.supabase
    .from('study_documents')
    .update({
      name: parsed.data.name,
      file_path: parsed.data.filePath,
      category: parsed.data.category,
    })
    .eq('id', context.document.id)
    .eq('study_id', context.study.id)
    .select('id')
    .single()

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: context.viewer.id,
      action: 'study_document.updated',
      entity_type: 'study_document',
      entity_id: context.document.id,
      old_value: {
        name: context.document.name,
        file_path: context.document.file_path,
        category: context.document.category,
      },
      new_value: {
        name: parsed.data.name,
        file_path: parsed.data.filePath,
        category: parsed.data.category,
      },
      metadata: {
        study_id: context.study.id,
        study_title: context.study.title,
      },
    })
  } catch (error) {
    console.warn('Study document update audit log failed', error)
  }

  revalidatePath(`/studies/${context.study.id}/documents`)
  revalidatePath(`/studies/${context.study.id}/audit`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      documentId: context.document.id,
      studyId: context.study.id,
    },
  }
}

/** Creates a follow-on version for a study document without mutating signed history. */
export async function createStudyDocumentVersion(
  raw: unknown,
): Promise<ActionResult<{ documentId: string; studyId: string; version: number }>> {
  const parsed = CreateStudyDocumentVersionSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid next-version request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to version study documents.' }
  }

  const context = await loadStudyDocumentLifecycleContext(
    parsed.data.studyId,
    parsed.data.documentId,
    user.id,
  )

  if (!context.success) {
    return { success: false, error: context.error }
  }

  const versionHistoryResult = await context.supabase
    .from('study_documents')
    .select('version')
    .eq('study_id', context.study.id)
    .eq('name', context.document.name)
    .eq('category', context.document.category)

  if (versionHistoryResult.error) {
    return { success: false, error: versionHistoryResult.error.message }
  }

  const existingVersions = z
    .object({ version: z.number().int().positive() })
    .array()
    .safeParse(versionHistoryResult.data)

  if (!existingVersions.success) {
    return { success: false, error: 'Unable to determine the next document version.' }
  }

  if (
    parsed.data.name !== context.document.name ||
    parsed.data.category !== context.document.category
  ) {
    return {
      success: false,
      error:
        'Next version keeps the existing document family name and category. Register a new document if the family should change.',
    }
  }

  const nextVersion =
    existingVersions.data.reduce((highest, row) => Math.max(highest, row.version), 0) + 1

  const insertResult = await context.supabase
    .from('study_documents')
    .insert({
      study_id: context.study.id,
      name: context.document.name,
      file_path: parsed.data.filePath,
      version: nextVersion,
      uploaded_by: context.viewer.id,
      category: context.document.category,
    })
    .select('id, version')
    .single()

  if (insertResult.error) {
    return { success: false, error: insertResult.error.message }
  }

  const insertedDocument = InsertedDocumentSchema.safeParse(insertResult.data)

  if (!insertedDocument.success) {
    return { success: false, error: 'Unable to validate the new document version.' }
  }

  if (context.study.sponsor_id !== context.viewer.id) {
    try {
      await invokeEdgeFunction('send-notification', {
        user_id: context.study.sponsor_id,
        type: 'task',
        title: 'New study document version registered',
        message: `${parsed.data.name} version ${String(insertedDocument.data.version)} was added to ${context.study.title}.`,
        entity_id: insertedDocument.data.id,
        priority: 'normal',
      })
    } catch (error) {
      console.warn('Study document version notification failed', error)
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: context.viewer.id,
      action: 'study_document.version_created',
      entity_type: 'study_document',
      entity_id: insertedDocument.data.id,
      metadata: {
        study_id: context.study.id,
        study_title: context.study.title,
        source_document_id: context.document.id,
        source_version: context.document.version,
        next_version: insertedDocument.data.version,
        name: context.document.name,
        category: context.document.category,
        file_path: parsed.data.filePath,
      },
    })
  } catch (error) {
    console.warn('Study document version audit log failed', error)
  }

  revalidatePath(`/studies/${context.study.id}/documents`)
  revalidatePath(`/studies/${context.study.id}/audit`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      documentId: insertedDocument.data.id,
      studyId: context.study.id,
      version: insertedDocument.data.version,
    },
  }
}
