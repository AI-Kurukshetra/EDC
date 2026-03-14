import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/admin.ts'

type NotificationPayload = {
  user_id: string
  type: string
  title: string
  message: string
  entity_id?: string
  priority?: 'low' | 'normal' | 'high'
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')

  if (!resendApiKey || !resendFromEmail) {
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to,
      subject,
      html,
    }),
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await request.json()) as NotificationPayload

    if (!payload.user_id || !payload.type || !payload.title || !payload.message) {
      return jsonResponse({ error: 'user_id, type, title, and message are required.' }, 400)
    }

    const supabase = createAdminClient()
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        entity_id: payload.entity_id ?? null,
        priority: payload.priority ?? 'normal',
      })
      .select('id')
      .single()

    if (notificationError) {
      throw notificationError
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', payload.user_id)
      .single()

    if (profileError) {
      throw profileError
    }

    if ((payload.priority ?? 'normal') === 'high') {
      await sendEmail(
        profile.email,
        payload.title,
        `<p>${payload.message}</p><p>Entity reference: ${payload.entity_id ?? 'n/a'}</p>`,
      )
    }

    return jsonResponse({ id: notification.id }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})
