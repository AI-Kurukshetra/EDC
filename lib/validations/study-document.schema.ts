import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_DOCUMENT_CATEGORIES } from '@/types'

export const RegisterStudyDocumentSchema = z.object({
  studyId: PostgresUuidSchema,
  name: z.string().min(3, 'Document name must be at least 3 characters').max(200).trim(),
  filePath: z.string().min(3, 'Document path is required').max(500).trim(),
  category: z.enum(STUDY_DOCUMENT_CATEGORIES),
  version: z.coerce.number().int().positive().max(1000),
})
