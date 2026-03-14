import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'

export const MarkAccountNotificationReadSchema = z.object({
  notificationId: PostgresUuidSchema,
})
