'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { SendAdminNotificationSchema } from '@/lib/validations/admin-notification.schema'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

import type { ActionResult } from '@/types/actions'

const ProfileRecipientSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
})

/** Sends a platform notification to one user, a role audience, or all active users. */
export async function sendAdminNotification(
  raw: unknown,
): Promise<ActionResult<{ deliveredCount: number; recipientCount: number }>> {
  const parsed = SendAdminNotificationSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid notification request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to send platform notifications.' }
  }

  const supabase = await getServerSupabase()
  const viewerResult = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', user.id)
    .single()

  if (viewerResult.error) {
    return { success: false, error: viewerResult.error.message }
  }

  const viewer = ProfileRecipientSchema.safeParse(viewerResult.data)

  if (!viewer.success) {
    return { success: false, error: 'Unable to validate your admin session.' }
  }

  if (viewer.data.role !== 'super_admin' || !viewer.data.is_active) {
    return { success: false, error: 'Only active super-admin users can send notifications.' }
  }

  let recipientsQuery = supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (parsed.data.scope === 'user') {
    recipientsQuery = recipientsQuery.eq('id', parsed.data.userId)
  } else if (parsed.data.scope === 'role') {
    recipientsQuery = recipientsQuery.eq('role', parsed.data.role)
  }

  const recipientsResult = await recipientsQuery

  if (recipientsResult.error) {
    return { success: false, error: recipientsResult.error.message }
  }

  const recipients = ProfileRecipientSchema.array().parse(recipientsResult.data)

  if (recipients.length === 0) {
    return { success: false, error: 'No active recipients matched the selected audience.' }
  }

  const deliveries = await Promise.allSettled(
    recipients.map((recipient) =>
      invokeEdgeFunction('send-notification', {
        user_id: recipient.id,
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
        entity_id: parsed.data.entityId?.trim() ? parsed.data.entityId.trim() : undefined,
        priority: parsed.data.priority,
      }),
    ),
  )

  const deliveredCount = deliveries.filter((delivery) => delivery.status === 'fulfilled').length

  if (deliveredCount === 0) {
    return { success: false, error: 'Notification delivery failed for every selected recipient.' }
  }

  let audienceEntityId = 'all_active'

  if (parsed.data.scope === 'user' && parsed.data.userId) {
    audienceEntityId = parsed.data.userId
  } else if (parsed.data.scope === 'role' && parsed.data.role) {
    audienceEntityId = parsed.data.role
  }

  try {
    await invokeEdgeFunction('audit-log', {
      user_id: viewer.data.id,
      action:
        deliveredCount === recipients.length ? 'notification.sent' : 'notification.partially_sent',
      entity_type: 'notification',
      entity_id: audienceEntityId,
      metadata: {
        scope: parsed.data.scope,
        title: parsed.data.title,
        type: parsed.data.type,
        priority: parsed.data.priority,
        recipient_count: recipients.length,
        delivered_count: deliveredCount,
      },
    })
  } catch (error) {
    console.warn('Notification audit log invocation failed', error)
  }

  revalidatePath('/admin')
  revalidatePath('/account')

  return {
    success: true,
    data: {
      deliveredCount,
      recipientCount: recipients.length,
    },
  }
}
