import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'

export const AdminUserLinkTypeSchema = z.enum(['magiclink', 'recovery'])

export const GenerateAdminUserAccessLinkSchema = z.object({
  userId: PostgresUuidSchema,
  linkType: AdminUserLinkTypeSchema,
})
