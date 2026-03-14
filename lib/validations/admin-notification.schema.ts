import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { NOTIFICATION_TYPES, QUERY_PRIORITIES, USER_ROLES } from '@/types'

export const ADMIN_NOTIFICATION_SCOPES = ['user', 'role', 'all_active'] as const

export const SendAdminNotificationSchema = z
  .object({
    scope: z.enum(ADMIN_NOTIFICATION_SCOPES),
    userId: PostgresUuidSchema.optional(),
    role: z.enum(USER_ROLES).optional(),
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().trim().min(3).max(120),
    message: z.string().trim().min(5).max(1000),
    entityId: z.string().trim().max(120).optional(),
    priority: z.enum(QUERY_PRIORITIES),
  })
  .superRefine((value, context) => {
    if (value.scope === 'user' && !value.userId) {
      context.addIssue({
        code: 'custom',
        message: 'A user target is required when sending to one recipient.',
        path: ['userId'],
      })
    }

    if (value.scope === 'role' && !value.role) {
      context.addIssue({
        code: 'custom',
        message: 'A role target is required when sending to a role audience.',
        path: ['role'],
      })
    }
  })
