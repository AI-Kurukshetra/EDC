'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { RegisterAdminStudyDocumentSchema } from '@/lib/validations/admin-document.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
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
  protocol_number: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const SponsorTargetSchema = z.object({
  id: PostgresUuidSchema,
  email: z.email(),
})

const InsertedDocumentSchema = z.object({
  id: PostgresUuidSchema,
})

/** Registers a new study document metadata record from the platform admin workspace. */
export async function registerAdminStudyDocument(
  raw: unknown,
): Promise<ActionResult<{ documentId: string; studyId: string }>> {
  const parsed = RegisterAdminStudyDocumentSchema.safeParse(raw)

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
    supabase
      .from('studies')
      .select('id, title, protocol_number, sponsor_id')
      .eq('id', parsed.data.studyId)
      .single(),
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

  if (viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return { success: false, error: 'Only active super-admin users can register study documents.' }
  }

  const insertResult = await supabase
    .from('study_documents')
    .insert({
      study_id: parsed.data.studyId,
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

  const sponsorResult = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', study.data.sponsor_id)
    .maybeSingle()

  if (!sponsorResult.error && sponsorResult.data) {
    const sponsor = SponsorTargetSchema.safeParse(sponsorResult.data)

    if (sponsor.success) {
      try {
        await invokeEdgeFunction('send-notification', {
          user_id: sponsor.data.id,
          type: 'task',
          title: 'New study document registered',
          message: `${parsed.data.name} was added to ${study.data.title} (${study.data.protocol_number}) in the admin document register.`,
          entity_id: insertedDocument.data.id,
          priority: 'normal',
        })
      } catch (error) {
        console.warn('Study document notification failed', error)
      }
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
        protocol_number: study.data.protocol_number,
        category: parsed.data.category,
        version: parsed.data.version,
        file_path: parsed.data.filePath,
      },
    })
  } catch (error) {
    console.warn('Study document audit log failed', error)
  }

  revalidatePath('/admin')
  revalidatePath(`/studies/${study.data.id}`)

  return {
    success: true,
    data: {
      documentId: insertedDocument.data.id,
      studyId: study.data.id,
    },
  }
}
