import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { DOCUMENT_SIGNATURE_MEANINGS } from '@/types'

export const SignStudyDocumentSchema = z.object({
  studyId: PostgresUuidSchema,
  documentId: PostgresUuidSchema,
  signatureMeaning: z.enum(DOCUMENT_SIGNATURE_MEANINGS),
  password: z.string().min(1, 'Re-enter your password to sign'),
})
