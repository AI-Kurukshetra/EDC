'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import {
  SaveStudyFormTemplateSchema,
  type SaveStudyFormTemplateInput,
} from '@/lib/validations/form-template.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'

import type { ActionResult } from '@/types/actions'

const SavedFormTemplateSchema = z.object({
  id: PostgresUuidSchema,
})

const ExistingFormTemplateSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
  version: z.number().int().positive(),
  is_published: z.boolean(),
})

function flattenErrors(result: {
  error: { flatten: () => { fieldErrors: Record<string, string[]> } }
}) {
  return result.error.flatten().fieldErrors
}

function getPublishedTemplateLockedMessage() {
  return 'Published templates are locked to preserve version history. Create the next version before editing.'
}

function getVersionConflictMessage(name: string, version: number) {
  return `Version ${version} already exists for ${name}. Increment the version or continue the existing draft instead.`
}

function toDatabasePayload(input: SaveStudyFormTemplateInput) {
  return {
    study_id: input.studyId,
    name: input.name,
    form_type: input.formType,
    version: input.version,
    is_published: input.isPublished,
    schema: input.schema,
    visit_schedule: input.visitSchedule,
  }
}

export async function saveStudyFormTemplate(
  raw: unknown,
): Promise<ActionResult<{ id: string; isPublished: boolean }>> {
  const parsed = SaveStudyFormTemplateSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: flattenErrors(parsed) }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage form templates.' }
  }

  const supabase = await getServerSupabase()
  const payload = toDatabasePayload(parsed.data)
  const isUpdate = Boolean(parsed.data.id)
  let saveResult

  if (isUpdate && parsed.data.id) {
    const existingTemplateResult = await supabase
      .from('form_templates')
      .select('id, name, version, is_published')
      .eq('id', parsed.data.id)
      .eq('study_id', parsed.data.studyId)
      .maybeSingle()

    if (existingTemplateResult.error) {
      return { success: false, error: existingTemplateResult.error.message }
    }

    if (!existingTemplateResult.data) {
      return { success: false, error: 'This form template no longer exists.' }
    }

    const existingTemplate = ExistingFormTemplateSchema.safeParse(existingTemplateResult.data)

    if (!existingTemplate.success) {
      return { success: false, error: 'Unable to load the selected form template.' }
    }

    if (existingTemplate.data.is_published) {
      return { success: false, error: getPublishedTemplateLockedMessage() }
    }
  }

  if (isUpdate && parsed.data.id) {
    saveResult = await supabase
      .from('form_templates')
      .update(payload)
      .eq('id', parsed.data.id)
      .eq('study_id', parsed.data.studyId)
      .select('id')
      .single()
  } else {
    saveResult = await supabase.from('form_templates').insert(payload).select('id').single()
  }

  if (saveResult.error) {
    if (saveResult.error.code === '23505') {
      return {
        success: false,
        error: getVersionConflictMessage(parsed.data.name, parsed.data.version),
      }
    }

    return { success: false, error: saveResult.error.message }
  }

  const savedTemplate = SavedFormTemplateSchema.safeParse(saveResult.data)

  if (!savedTemplate.success) {
    return { success: false, error: 'Unable to save the form template.' }
  }

  if (parsed.data.isPublished) {
    const retirePreviousVersionsResult = await supabase
      .from('form_templates')
      .update({ is_published: false })
      .eq('study_id', parsed.data.studyId)
      .eq('name', parsed.data.name)
      .eq('is_published', true)
      .neq('id', savedTemplate.data.id)

    if (retirePreviousVersionsResult.error) {
      return { success: false, error: retirePreviousVersionsResult.error.message }
    }
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: user.id,
      action: isUpdate ? 'form_template.updated' : 'form_template.created',
      entity_type: 'form_template',
      entity_id: savedTemplate.data.id,
      old_value: null,
      new_value: parsed.data,
    })
  } catch (error) {
    console.warn('Audit log invocation failed', error)
  }

  revalidatePath(`/studies/${parsed.data.studyId}`)
  revalidatePath(`/studies/${parsed.data.studyId}/forms`)

  return {
    success: true,
    data: {
      id: savedTemplate.data.id,
      isPublished: parsed.data.isPublished,
    },
  }
}
