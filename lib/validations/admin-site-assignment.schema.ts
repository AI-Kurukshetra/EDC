import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { USER_ROLES } from '@/types'

export const AssignAdminUserSiteSchema = z.object({
  userId: PostgresUuidSchema,
  siteId: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
})

export const RemoveAdminUserSiteAssignmentSchema = z.object({
  assignmentId: PostgresUuidSchema,
})
