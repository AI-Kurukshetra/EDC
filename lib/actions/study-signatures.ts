'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { sha256 } from '@/lib/utils/crypto'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { SignStudyDocumentSchema } from '@/lib/validations/study-signature.schema'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ViewerProfileSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

const StudyDocumentRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  version: z.number().int().positive(),
  category: z.string(),
})

const ExistingSignatureRowSchema = z.object({
  id: PostgresUuidSchema,
})

const InsertedSignatureRowSchema = z.object({
  id: PostgresUuidSchema,
})

/** Captures an immutable signature for a study document after password re-authentication. */
export async function signStudyDocument(
  raw: unknown,
): Promise<ActionResult<{ signatureId: string; documentId: string; studyId: string }>> {
  const parsed = SignStudyDocumentSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid signature request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to capture a signature.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, documentResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase
      .from('study_documents')
      .select('id, study_id, name, version, category')
      .eq('id', parsed.data.documentId)
      .eq('study_id', parsed.data.studyId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (documentResult.error) {
    return { success: false, error: documentResult.error.message }
  }

  if (!documentResult.data) {
    return { success: false, error: 'This study document could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const document = StudyDocumentRowSchema.safeParse(documentResult.data)

  if (!viewer.success || !document.success) {
    return { success: false, error: 'Unable to validate the requested signature context.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const reauthResult = await supabase.auth.signInWithPassword({
    email: viewer.data.email,
    password: parsed.data.password,
  })

  if (reauthResult.error) {
    return { success: false, error: 'Password verification failed. Signature not captured.' }
  }

  if (reauthResult.data.user.id !== viewer.data.id) {
    return { success: false, error: 'Unable to verify your signing identity.' }
  }

  const duplicateSignatureResult = await supabase
    .from('signatures')
    .select('id')
    .eq('entity_type', 'study_document')
    .eq('entity_id', document.data.id)
    .eq('signed_by', viewer.data.id)
    .eq('signature_meaning', parsed.data.signatureMeaning)
    .limit(1)
    .maybeSingle()

  if (duplicateSignatureResult.error) {
    return { success: false, error: duplicateSignatureResult.error.message }
  }

  if (duplicateSignatureResult.data) {
    const duplicateSignature = ExistingSignatureRowSchema.safeParse(duplicateSignatureResult.data)

    if (duplicateSignature.success) {
      return {
        success: false,
        error: 'You already signed this document with the same certification meaning.',
      }
    }
  }

  const signedAt = new Date().toISOString()
  const certificateHash = await sha256(
    [
      viewer.data.id,
      viewer.data.email,
      parsed.data.studyId,
      document.data.id,
      document.data.version,
      parsed.data.signatureMeaning,
      signedAt,
    ].join(':'),
  )

  const insertResult = await supabase
    .from('signatures')
    .insert({
      entity_type: 'study_document',
      entity_id: document.data.id,
      signed_by: viewer.data.id,
      signature_meaning: parsed.data.signatureMeaning,
      signed_at: signedAt,
      certificate_hash: certificateHash,
    })
    .select('id')
    .single()

  if (insertResult.error) {
    return { success: false, error: insertResult.error.message }
  }

  const insertedSignature = InsertedSignatureRowSchema.safeParse(insertResult.data)

  if (!insertedSignature.success) {
    return { success: false, error: 'Unable to validate the saved signature record.' }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'signature.captured',
      entity_type: 'study_document',
      entity_id: document.data.id,
      metadata: {
        study_id: parsed.data.studyId,
        document_id: document.data.id,
        document_name: document.data.name,
        document_version: document.data.version,
        category: document.data.category,
        signature_meaning: parsed.data.signatureMeaning,
        signature_id: insertedSignature.data.id,
      },
    })
  } catch (error) {
    console.warn('Study document signature audit log failed', error)
  }

  revalidatePath(`/studies/${parsed.data.studyId}/documents`)
  revalidatePath(`/studies/${parsed.data.studyId}/audit`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      signatureId: insertedSignature.data.id,
      documentId: document.data.id,
      studyId: parsed.data.studyId,
    },
  }
}
