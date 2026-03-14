import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { EXPORT_SIGNATURE_MEANINGS } from '@/types'

export const RequestStudyExportSchema = z.object({
  studyId: PostgresUuidSchema,
  format: z.enum(['csv', 'json', 'cdisc']),
})

export const RequestSignedStudyExportSchema = RequestStudyExportSchema.extend({
  signatureMeaning: z.enum(EXPORT_SIGNATURE_MEANINGS),
  password: z.string().min(1, 'Re-enter your password to request and sign this export'),
})
