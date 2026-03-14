import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

export const UpdateAdminUserAccessSchema = z.object({
  userId: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
})
