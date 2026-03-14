import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/admin.ts'

type AuditPayload = {
  user_id?: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value?: unknown
  new_value?: unknown
  ip_address?: string | null
  metadata?: Record<string, unknown>
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await request.json()) as AuditPayload

    if (!payload.action || !payload.entity_type || !payload.entity_id) {
      return jsonResponse({ error: 'action, entity_type, and entity_id are required.' }, 400)
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: payload.user_id ?? null,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        old_value: payload.old_value ?? null,
        new_value: payload.new_value ?? null,
        ip_address: payload.ip_address ?? null,
        metadata: payload.metadata ?? {},
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return jsonResponse({ id: data.id }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})
