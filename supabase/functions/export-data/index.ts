import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/admin.ts'

type ExportPayload = {
  study_id: string
  requested_by: string
  format: 'csv' | 'json' | 'cdisc'
  site_ids?: string[]
  form_ids?: string[]
  date_range?: {
    from?: string
    to?: string
  }
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return 'study_id,subject_id,form_name,visit_number,visit_date,status,data\n'
  }

  const headers = Object.keys(rows[0])
  const serializedRows = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '')
        return `"${String(serialized).replaceAll('"', '""')}"`
      })
      .join(','),
  )

  return [headers.join(','), ...serializedRows].join('\n')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await request.json()) as ExportPayload

    if (!payload.study_id || !payload.requested_by || !payload.format) {
      return jsonResponse({ error: 'study_id, requested_by, and format are required.' }, 400)
    }

    const supabase = createAdminClient()

    const { data: exportJob, error: exportJobError } = await supabase
      .from('data_exports')
      .insert({
        study_id: payload.study_id,
        requested_by: payload.requested_by,
        format: payload.format,
        filters: {
          site_ids: payload.site_ids ?? [],
          form_ids: payload.form_ids ?? [],
          date_range: payload.date_range ?? {},
        },
        status: 'processing',
      })
      .select('id')
      .single()

    if (exportJobError) {
      throw exportJobError
    }

    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id, subject_id, site_id')
      .eq('study_id', payload.study_id)

    if (subjectError) {
      throw subjectError
    }

    const subjectIds = (subjects ?? []).map((subject) => subject.id)

    const { data: forms, error: formError } = await supabase
      .from('form_templates')
      .select('id, name, form_type')
      .eq('study_id', payload.study_id)

    if (formError) {
      throw formError
    }

    const filteredSubjectIds =
      payload.site_ids && payload.site_ids.length > 0
        ? (subjects ?? [])
            .filter((subject) => payload.site_ids?.includes(subject.site_id))
            .map((subject) => subject.id)
        : subjectIds

    let entryQuery = supabase
      .from('data_entries')
      .select('id, subject_id, form_template_id, visit_number, visit_date, status, data')
      .in('subject_id', filteredSubjectIds)

    if (payload.form_ids && payload.form_ids.length > 0) {
      entryQuery = entryQuery.in('form_template_id', payload.form_ids)
    }

    if (payload.date_range?.from) {
      entryQuery = entryQuery.gte('visit_date', payload.date_range.from)
    }

    if (payload.date_range?.to) {
      entryQuery = entryQuery.lte('visit_date', payload.date_range.to)
    }

    const { data: entries, error: entryError } = await entryQuery

    if (entryError) {
      throw entryError
    }

    const subjectLookup = new Map((subjects ?? []).map((subject) => [subject.id, subject]))
    const formLookup = new Map((forms ?? []).map((form) => [form.id, form]))

    const rows = (entries ?? []).map((entry) => ({
      study_id: payload.study_id,
      subject_id: subjectLookup.get(entry.subject_id)?.subject_id ?? entry.subject_id,
      form_name: formLookup.get(entry.form_template_id)?.name ?? entry.form_template_id,
      visit_number: entry.visit_number,
      visit_date: entry.visit_date,
      status: entry.status,
      data: entry.data,
    }))

    const fileBody =
      payload.format === 'csv'
        ? toCsv(rows)
        : JSON.stringify(
            {
              study_id: payload.study_id,
              format: payload.format,
              exported_at: new Date().toISOString(),
              rows,
            },
            null,
            2,
          )

    const fileExtension = payload.format === 'csv' ? 'csv' : 'json'
    const filePath = `${payload.study_id}/${exportJob.id}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, fileBody, {
        upsert: true,
        contentType: payload.format === 'csv' ? 'text/csv' : 'application/json',
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(filePath, 60 * 60 * 24)

    if (signedUrlError) {
      throw signedUrlError
    }

    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('data_exports')
      .update({
        file_path: filePath,
        status: 'completed',
        completed_at: new Date().toISOString(),
        signed_url_expires_at: expiration,
      })
      .eq('id', exportJob.id)

    if (updateError) {
      throw updateError
    }

    await supabase.from('audit_logs').insert({
      user_id: payload.requested_by,
      action: 'export.created',
      entity_type: 'data_export',
      entity_id: exportJob.id,
      old_value: null,
      new_value: {
        study_id: payload.study_id,
        format: payload.format,
        file_path: filePath,
      },
    })

    return jsonResponse(
      {
        id: exportJob.id,
        signed_url: signedUrlData.signedUrl,
        expires_at: expiration,
      },
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})
