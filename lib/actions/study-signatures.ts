'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { sha256 } from '@/lib/utils/crypto'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  SignStudyDataEntrySchema,
  SignStudyDocumentSchema,
  SignStudySchema,
} from '@/lib/validations/study-signature.schema'
import { DATA_ENTRY_STATUSES, USER_ROLES } from '@/types'

import type { StudyDataEntry } from '@/types'
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

const StudyDataEntryRowSchema = z.object({
  id: PostgresUuidSchema,
  subject_id: PostgresUuidSchema,
  form_template_id: PostgresUuidSchema,
  visit_number: z.number().int().positive(),
  visit_date: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(DATA_ENTRY_STATUSES),
  submitted_by: PostgresUuidSchema.nullable(),
  submitted_at: z.string().nullable(),
  locked_by: PostgresUuidSchema.nullable(),
  locked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  protocol_number: z.string(),
  phase: z.string(),
  status: z.string(),
  sponsor_id: PostgresUuidSchema.nullable(),
})

const ExistingSignatureRowSchema = z.object({
  id: PostgresUuidSchema,
})

const InsertedSignatureRowSchema = z.object({
  id: PostgresUuidSchema,
})

const SubjectStudyLinkSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  subject_id: z.string(),
})

function normalizeEntryData(raw: z.infer<typeof StudyDataEntryRowSchema>['data']): StudyDataEntry['data'] {
  const normalized: StudyDataEntry['data'] = {}

  for (const [fieldId, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number') {
      normalized[fieldId] = value
      continue
    }

    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      normalized[fieldId] = value
    }
  }

  return normalized
}

const FormTemplateLinkSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  version: z.number().int().positive(),
})

function mapSignedDataEntry(
  row: z.infer<typeof StudyDataEntryRowSchema>,
  viewer: z.infer<typeof ViewerProfileSchema>,
  signatureMeaning: string,
): StudyDataEntry {
  const data = normalizeEntryData(row.data)

  return {
    id: row.id,
    subjectId: row.subject_id,
    formTemplateId: row.form_template_id,
    visitNumber: row.visit_number,
    visitDate: row.visit_date,
    data,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedByName: row.submitted_by === viewer.id ? viewer.full_name : null,
    submittedByEmail: row.submitted_by === viewer.id ? viewer.email : null,
    submittedAt: row.submitted_at,
    lockedBy: row.locked_by,
    lockedByName: row.locked_by === viewer.id ? viewer.full_name : null,
    lockedByEmail: row.locked_by === viewer.id ? viewer.email : null,
    lockedAt: row.locked_at,
    signatureCount: 1,
    latestSignedAt: row.locked_at,
    latestSignedByName: viewer.full_name,
    latestSignedByEmail: viewer.email,
    latestSignatureMeaning: signatureMeaning as StudyDataEntry['latestSignatureMeaning'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Captures an immutable signature for the study record after password re-authentication. */
export async function signStudyRecord(
  raw: unknown,
): Promise<ActionResult<{ signatureId: string; studyId: string }>> {
  const parsed = SignStudySchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid signature request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to capture a signature.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, studyResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase
      .from('studies')
      .select('id, title, protocol_number, phase, status, sponsor_id')
      .eq('id', parsed.data.studyId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (studyResult.error) {
    return { success: false, error: studyResult.error.message }
  }

  if (!studyResult.data) {
    return { success: false, error: 'This study could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const study = StudyRowSchema.safeParse(studyResult.data)

  if (!viewer.success || !study.success) {
    return { success: false, error: 'Unable to validate the requested signature context.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const canSignStudy =
    study.data.sponsor_id === viewer.data.id ||
    viewer.data.role === 'super_admin' ||
    viewer.data.role === 'data_manager' ||
    viewer.data.role === 'monitor'

  if (!canSignStudy) {
    return {
      success: false,
      error: 'Only the study sponsor, monitors, data managers, or super admins can sign.',
    }
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
    .eq('entity_type', 'study')
    .eq('entity_id', study.data.id)
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
        error: 'You already signed this study with the same certification meaning.',
      }
    }
  }

  const signedAt = new Date().toISOString()
  const certificateHash = await sha256(
    [
      viewer.data.id,
      viewer.data.email,
      study.data.id,
      study.data.protocol_number,
      study.data.status,
      parsed.data.signatureMeaning,
      signedAt,
    ].join(':'),
  )

  const insertResult = await supabase
    .from('signatures')
    .insert({
      entity_type: 'study',
      entity_id: study.data.id,
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
      entity_type: 'study',
      entity_id: study.data.id,
      metadata: {
        study_id: study.data.id,
        study_title: study.data.title,
        protocol_number: study.data.protocol_number,
        phase: study.data.phase,
        status: study.data.status,
        signature_meaning: parsed.data.signatureMeaning,
        signature_id: insertedSignature.data.id,
      },
    })
  } catch (error) {
    console.warn('Study signature audit log failed', error)
  }

  revalidatePath(`/studies/${study.data.id}`)
  revalidatePath(`/studies/${study.data.id}/audit`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      signatureId: insertedSignature.data.id,
      studyId: study.data.id,
    },
  }
}

/** Captures an immutable signature for a submitted data entry and locks it from further edits. */
export async function signStudyDataEntry(
  raw: unknown,
): Promise<ActionResult<{ signatureId: string; entry: StudyDataEntry; studyId: string }>> {
  const parsed = SignStudyDataEntrySchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid signature request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to capture a signature.' }
  }

  const supabase = await getServerSupabase()
  const [viewerResult, entryResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .single(),
    supabase
      .from('data_entries')
      .select(
        'id, subject_id, form_template_id, visit_number, visit_date, data, status, submitted_by, submitted_at, locked_by, locked_at, created_at, updated_at',
      )
      .eq('id', parsed.data.entryId)
      .maybeSingle(),
  ])

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  if (entryResult.error) {
    return { success: false, error: entryResult.error.message }
  }

  if (!entryResult.data) {
    return { success: false, error: 'This data entry could not be found.' }
  }

  const viewer = ViewerProfileSchema.safeParse(viewerResult.data)
  const entry = StudyDataEntryRowSchema.safeParse(entryResult.data)

  if (!viewer.success || !entry.success) {
    return { success: false, error: 'Unable to validate the requested signature context.' }
  }

  const [subjectResult, templateResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, study_id, subject_id')
      .eq('id', entry.data.subject_id)
      .maybeSingle(),
    supabase
      .from('form_templates')
      .select('id, study_id, name, version')
      .eq('id', entry.data.form_template_id)
      .maybeSingle(),
  ])

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message }
  }

  if (templateResult.error) {
    return { success: false, error: templateResult.error.message }
  }

  if (!subjectResult.data || !templateResult.data) {
    return { success: false, error: 'This data entry is missing its study context.' }
  }

  const subject = SubjectStudyLinkSchema.safeParse(subjectResult.data)
  const template = FormTemplateLinkSchema.safeParse(templateResult.data)

  if (!subject.success || !template.success) {
    return { success: false, error: 'Unable to validate the requested signature context.' }
  }

  if (
    subject.data.study_id !== parsed.data.studyId ||
    template.data.study_id !== parsed.data.studyId
  ) {
    return { success: false, error: 'This data entry does not belong to the requested study.' }
  }

  if (!viewer.data.is_active) {
    return { success: false, error: 'Your account is inactive. Contact an administrator.' }
  }

  const canSignEntry = [
    'super_admin',
    'investigator',
    'coordinator',
    'monitor',
    'data_manager',
  ].includes(viewer.data.role)

  if (!canSignEntry) {
    return {
      success: false,
      error:
        'Only investigators, coordinators, monitors, data managers, or super admins can sign.',
    }
  }

  if (entry.data.status === 'locked' || entry.data.status === 'sdv_complete') {
    return { success: false, error: 'This data entry is already locked.' }
  }

  if (entry.data.status !== 'submitted' && entry.data.status !== 'sdv_required') {
    return {
      success: false,
      error: 'Only submitted entries can be signed and locked.',
    }
  }

  const duplicateSignatureResult = await supabase
    .from('signatures')
    .select('id')
    .eq('entity_type', 'data_entry')
    .eq('entity_id', entry.data.id)
    .limit(1)
    .maybeSingle()

  if (duplicateSignatureResult.error) {
    return { success: false, error: duplicateSignatureResult.error.message }
  }

  if (duplicateSignatureResult.data) {
    return { success: false, error: 'This data entry already has a captured signature.' }
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

  const signedAt = new Date().toISOString()
  const certificateHash = await sha256(
    [
      viewer.data.id,
      viewer.data.email,
      parsed.data.studyId,
      entry.data.id,
      subject.data.subject_id,
      template.data.name,
      entry.data.visit_number,
      parsed.data.signatureMeaning,
      signedAt,
    ].join(':'),
  )

  const signatureInsertResult = await supabase
    .from('signatures')
    .insert({
      entity_type: 'data_entry',
      entity_id: entry.data.id,
      signed_by: viewer.data.id,
      signature_meaning: parsed.data.signatureMeaning,
      signed_at: signedAt,
      certificate_hash: certificateHash,
    })
    .select('id')
    .single()

  if (signatureInsertResult.error) {
    return { success: false, error: signatureInsertResult.error.message }
  }

  const insertedSignature = InsertedSignatureRowSchema.safeParse(signatureInsertResult.data)

  if (!insertedSignature.success) {
    return { success: false, error: 'Unable to validate the saved signature record.' }
  }

  const lockedEntryResult = await supabase
    .from('data_entries')
    .update({
      status: 'locked',
      locked_by: viewer.data.id,
      locked_at: signedAt,
    })
    .eq('id', entry.data.id)
    .select(
      'id, subject_id, form_template_id, visit_number, visit_date, data, status, submitted_by, submitted_at, locked_by, locked_at, created_at, updated_at',
    )
    .single()

  if (lockedEntryResult.error) {
    await supabase.from('signatures').delete().eq('id', insertedSignature.data.id)
    return { success: false, error: lockedEntryResult.error.message }
  }

  const lockedEntry = StudyDataEntryRowSchema.safeParse(lockedEntryResult.data)

  if (!lockedEntry.success) {
    return { success: false, error: 'Unable to validate the locked data entry.' }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action: 'signature.captured',
      entity_type: 'data_entry',
      entity_id: entry.data.id,
      metadata: {
        study_id: parsed.data.studyId,
        subject_id: subject.data.id,
        subject_label: subject.data.subject_id,
        form_template_id: template.data.id,
        form_name: template.data.name,
        form_version: template.data.version,
        visit_number: entry.data.visit_number,
        signature_meaning: parsed.data.signatureMeaning,
        signature_id: insertedSignature.data.id,
        status_after_sign: 'locked',
      },
    })
  } catch (error) {
    console.warn('Study data-entry signature audit log failed', error)
  }

  revalidatePath(`/studies/${parsed.data.studyId}`)
  revalidatePath(`/studies/${parsed.data.studyId}/data`)
  revalidatePath(`/studies/${parsed.data.studyId}/queries`)
  revalidatePath(`/studies/${parsed.data.studyId}/audit`)
  revalidatePath('/admin')

  return {
    success: true,
    data: {
      signatureId: insertedSignature.data.id,
      entry: mapSignedDataEntry(lockedEntry.data, viewer.data, parsed.data.signatureMeaning),
      studyId: parsed.data.studyId,
    },
  }
}

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
