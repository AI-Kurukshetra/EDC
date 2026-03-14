import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { DOCUMENT_SIGNATURE_MEANINGS, STUDY_SIGNATURE_MEANINGS } from '@/types'

export const SignStudySchema = z.object({
  studyId: PostgresUuidSchema,
  signatureMeaning: z.enum(STUDY_SIGNATURE_MEANINGS),
  password: z.string().min(1, 'Re-enter your password to sign'),
})

export const SignStudyDocumentSchema = z.object({
  studyId: PostgresUuidSchema,
  documentId: PostgresUuidSchema,
  signatureMeaning: z.enum(DOCUMENT_SIGNATURE_MEANINGS),
  password: z.string().min(1, 'Re-enter your password to sign'),
})
