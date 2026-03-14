'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { buildCrfEntrySchema, isReadOnlyDataEntryStatus } from '@/lib/utils/crf-entry'
import { SaveStudyDataEntrySchema } from '@/lib/validations/data-entry.schema'
import { CrfSchemaSchema } from '@/lib/validations/form-template.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { DATA_ENTRY_STATUSES, type StudyDataEntry } from '@/types'

import type { ActionResult } from '@/types/actions'

const TemplateSchemaRow = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  is_published: z.boolean(),
  schema: z.unknown(),
})

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
})

const ExistingEntryRowSchema = z.object({
  id: PostgresUuidSchema,
  status: z.enum(DATA_ENTRY_STATUSES),
})

const SavedEntryRowSchema = z.object({
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

function collectZodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const fieldName = String(issue.path[0] ?? 'root')
    fieldErrors[fieldName] ??= []
    fieldErrors[fieldName].push(issue.message)
  }

  return fieldErrors
}

function mapSavedEntry(
  row: z.infer<typeof SavedEntryRowSchema>,
  data: StudyDataEntry['data'],
): StudyDataEntry {
  return {
    id: row.id,
    subjectId: row.subject_id,
    formTemplateId: row.form_template_id,
    visitNumber: row.visit_number,
    visitDate: row.visit_date,
    data,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedByName: null,
    submittedByEmail: null,
    submittedAt: row.submitted_at,
    lockedBy: row.locked_by,
    lockedByName: null,
    lockedByEmail: null,
    lockedAt: row.locked_at,
    signatureCount: 0,
    latestSignedAt: null,
    latestSignedByName: null,
    latestSignedByEmail: null,
    latestSignatureMeaning: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Saves or submits a study data entry after validating the payload against the published CRF schema. */
export async function saveStudyDataEntry(raw: unknown): Promise<ActionResult<StudyDataEntry>> {
  const parsed = SaveStudyDataEntrySchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: collectZodFieldErrors(parsed.error) }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to capture study data.' }
  }

  const supabase = await getServerSupabase()

  const [templateResult, subjectResult] = await Promise.all([
    supabase
      .from('form_templates')
      .select('id, study_id, is_published, schema')
      .eq('id', parsed.data.formTemplateId)
      .maybeSingle(),
    supabase.from('subjects').select('id, study_id').eq('id', parsed.data.subjectId).maybeSingle(),
  ])

  if (templateResult.error) {
    return { success: false, error: templateResult.error.message }
  }

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message }
  }

  if (!templateResult.data || !subjectResult.data) {
    return { success: false, error: 'The selected subject or form template could not be found.' }
  }

  const parsedTemplate = TemplateSchemaRow.safeParse(templateResult.data)
  const parsedSubject = SubjectRowSchema.safeParse(subjectResult.data)

  if (!parsedTemplate.success || !parsedSubject.success) {
    return { success: false, error: 'Unable to validate the study data context.' }
  }

  if (
    parsedTemplate.data.study_id !== parsed.data.studyId ||
    parsedSubject.data.study_id !== parsed.data.studyId
  ) {
    return { success: false, error: 'The selected subject and form must belong to this study.' }
  }

  if (!parsedTemplate.data.is_published) {
    return { success: false, error: 'Only published CRFs can be used for study data entry.' }
  }

  const parsedSchema = CrfSchemaSchema.safeParse(parsedTemplate.data.schema)

  if (!parsedSchema.success) {
    return { success: false, error: 'The selected CRF schema is invalid and cannot be rendered.' }
  }

  const validatedEntryData = buildCrfEntrySchema(parsedSchema.data.fields).safeParse(
    parsed.data.data,
  )

  if (!validatedEntryData.success) {
    return {
      success: false,
      error: collectZodFieldErrors(validatedEntryData.error),
    }
  }

  let existingEntryResult

  if (parsed.data.id) {
    existingEntryResult = await supabase
      .from('data_entries')
      .select('id, status')
      .eq('id', parsed.data.id)
      .eq('subject_id', parsed.data.subjectId)
      .eq('form_template_id', parsed.data.formTemplateId)
      .eq('visit_number', parsed.data.visitNumber)
      .maybeSingle()

    if (existingEntryResult.error) {
      return { success: false, error: existingEntryResult.error.message }
    }

    if (!existingEntryResult.data) {
      return { success: false, error: 'This data entry no longer exists.' }
    }
  } else {
    existingEntryResult = await supabase
      .from('data_entries')
      .select('id, status')
      .eq('subject_id', parsed.data.subjectId)
      .eq('form_template_id', parsed.data.formTemplateId)
      .eq('visit_number', parsed.data.visitNumber)
      .maybeSingle()

    if (existingEntryResult.error) {
      return { success: false, error: existingEntryResult.error.message }
    }
  }

  const existingEntry = existingEntryResult.data
    ? ExistingEntryRowSchema.safeParse(existingEntryResult.data)
    : null

  if (existingEntry && !existingEntry.success) {
    return { success: false, error: 'Unable to load the existing data entry.' }
  }

  if (existingEntry?.data && isReadOnlyDataEntryStatus(existingEntry.data.status)) {
    return {
      success: false,
      error: 'This data entry is locked and can no longer be edited.',
    }
  }

  const savePayload = {
    subject_id: parsed.data.subjectId,
    form_template_id: parsed.data.formTemplateId,
    visit_number: parsed.data.visitNumber,
    visit_date: parsed.data.visitDate ?? null,
    data: validatedEntryData.data,
    status: parsed.data.saveMode === 'submit' ? 'submitted' : 'draft',
    submitted_by: parsed.data.saveMode === 'submit' ? user.id : null,
    submitted_at: parsed.data.saveMode === 'submit' ? new Date().toISOString() : null,
  } satisfies Record<string, unknown>

  const selectClause =
    'id, subject_id, form_template_id, visit_number, visit_date, data, status, submitted_by, submitted_at, locked_by, locked_at, created_at, updated_at'

  const saveResult = existingEntry?.data
    ? await supabase
        .from('data_entries')
        .update(savePayload)
        .eq('id', existingEntry.data.id)
        .select(selectClause)
        .single()
    : await supabase.from('data_entries').insert(savePayload).select(selectClause).single()

  if (saveResult.error) {
    if (saveResult.error.code === '23505') {
      return {
        success: false,
        error: 'This visit number already exists for the selected subject and CRF.',
      }
    }

    return { success: false, error: saveResult.error.message }
  }

  const savedEntry = SavedEntryRowSchema.safeParse(saveResult.data)

  if (!savedEntry.success) {
    return { success: false, error: 'Unable to save the study data entry.' }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: user.id,
      action: existingEntry?.data ? 'data_entry.updated' : 'data_entry.created',
      entity_type: 'data_entry',
      entity_id: savedEntry.data.id,
      old_value: null,
      new_value: parsed.data,
    })
  } catch (error) {
    console.warn('Audit log invocation failed', error)
  }

  if (parsed.data.saveMode === 'submit') {
    try {
      await invokeEdgeFunction('generate-queries', {
        data_entry_id: savedEntry.data.id,
        raised_by: user.id,
      })
    } catch (error) {
      console.warn('Auto-query generation failed', error)
    }
  }

  revalidatePath(`/studies/${parsed.data.studyId}`)
  revalidatePath(`/studies/${parsed.data.studyId}/data`)
  revalidatePath(`/studies/${parsed.data.studyId}/queries`)

  return {
    success: true,
    data: mapSavedEntry(savedEntry.data, validatedEntryData.data),
  }
}
