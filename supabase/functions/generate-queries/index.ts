import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/admin.ts'

type GenerateQueriesPayload = {
  data_entry_id: string
  raised_by: string
  assigned_to?: string
  priority?: 'low' | 'normal' | 'high'
}

type FormField = {
  id: string
  label: string
  required?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

function buildQueryMessage(field: FormField, value: unknown) {
  return `Auto-query: ${field.label} has a value (${String(value)}) that is missing or outside the configured validation range.`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await request.json()) as GenerateQueriesPayload

    if (!payload.data_entry_id || !payload.raised_by) {
      return jsonResponse({ error: 'data_entry_id and raised_by are required.' }, 400)
    }

    const supabase = createAdminClient()
    const { data: entry, error: entryError } = await supabase
      .from('data_entries')
      .select('id, subject_id, form_template_id, data')
      .eq('id', payload.data_entry_id)
      .single()

    if (entryError) {
      throw entryError
    }

    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .select('schema')
      .eq('id', entry.form_template_id)
      .single()

    if (templateError) {
      throw templateError
    }

    const fields = ((template.schema as { fields?: FormField[] }).fields ?? []) as FormField[]
    const values = (entry.data as Record<string, unknown>) ?? {}

    const { data: existingQueries, error: existingQueryError } = await supabase
      .from('queries')
      .select('field_id')
      .eq('data_entry_id', entry.id)
      .in('status', ['open', 'answered'])

    if (existingQueryError) {
      throw existingQueryError
    }

    const existingFieldIds = new Set((existingQueries ?? []).map((query) => query.field_id))

    const generatedQueries = fields.flatMap((field) => {
      const value = values[field.id]
      const isEmpty =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      const failedRequired = field.required && isEmpty
      const numericValue = typeof value === 'number' ? value : Number(value)
      const failedMin =
        field.validation?.min !== undefined &&
        !Number.isNaN(numericValue) &&
        numericValue < field.validation.min
      const failedMax =
        field.validation?.max !== undefined &&
        !Number.isNaN(numericValue) &&
        numericValue > field.validation.max
      const failedPattern =
        field.validation?.pattern !== undefined &&
        typeof value === 'string' &&
        !new RegExp(field.validation.pattern).test(value)

      if (!failedRequired && !failedMin && !failedMax && !failedPattern) {
        return []
      }

      if (existingFieldIds.has(field.id)) {
        return []
      }

      return [
        {
          data_entry_id: entry.id,
          field_id: field.id,
          subject_id: entry.subject_id,
          query_text: buildQueryMessage(field, value),
          status: 'open',
          raised_by: payload.raised_by,
          assigned_to: payload.assigned_to ?? null,
          priority: payload.priority ?? 'normal',
        },
      ]
    })

    if (generatedQueries.length === 0) {
      return jsonResponse({ created: 0 })
    }

    const { data, error } = await supabase.from('queries').insert(generatedQueries).select('id')

    if (error) {
      throw error
    }

    if (payload.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: payload.assigned_to,
        type: 'new_query',
        title: 'Auto-query generated',
        message: `${generatedQueries.length} automated query(s) require review.`,
        entity_id: payload.data_entry_id,
        priority: payload.priority ?? 'normal',
      })
    }

    return jsonResponse({ created: data?.length ?? 0 }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})
