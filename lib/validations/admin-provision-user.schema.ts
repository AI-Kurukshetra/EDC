import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

export const ProvisionAdminUserSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(120),
    email: z.email('Enter a valid email address'),
    role: z.enum(USER_ROLES),
    temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters'),
    siteId: PostgresUuidSchema.optional(),
    siteRole: z.enum(USER_ROLES).optional(),
  })
  .superRefine((value, context) => {
    if (value.siteId && !value.siteRole) {
      context.addIssue({
        code: 'custom',
        path: ['siteRole'],
        message: 'Choose a site role when assigning a user to a site.',
      })
    }

    if (!value.siteId && value.siteRole) {
      context.addIssue({
        code: 'custom',
        path: ['siteId'],
        message: 'Choose a site before assigning a site role.',
      })
    }
  })
