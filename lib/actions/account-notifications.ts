'use server'

import { revalidatePath } from 'next/cache'

import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { MarkAccountNotificationReadSchema } from '@/lib/validations/account-notification.schema'

import type { ActionResult } from '@/types/actions'

/** Marks one notification as read for the current signed-in user. */
export async function markAccountNotificationRead(
  raw: unknown,
): Promise<ActionResult<{ notificationId: string }>> {
  const parsed = MarkAccountNotificationReadSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Invalid notification read request.' }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to update notifications.' }
  }

  const supabase = await getServerSupabase()
  const updateResult = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', parsed.data.notificationId)
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id')
    .maybeSingle()

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  revalidatePath('/account')

  return {
    success: true,
    data: {
      notificationId: parsed.data.notificationId,
    },
  }
}

/** Marks every unread notification as read for the current signed-in user. */
export async function markAllAccountNotificationsRead(): Promise<ActionResult<{ count: number }>> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to update notifications.' }
  }

  const supabase = await getServerSupabase()
  const updateResult = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id')

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message }
  }

  revalidatePath('/account')

  return {
    success: true,
    data: {
      count: updateResult.data.length,
    },
  }
}
