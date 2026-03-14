import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'

export const RequestStudyExportSchema = z.object({
  studyId: PostgresUuidSchema,
  format: z.enum(['csv', 'json', 'cdisc']),
})
