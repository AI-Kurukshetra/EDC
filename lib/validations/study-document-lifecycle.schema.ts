import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_DOCUMENT_CATEGORIES } from '@/types'

const StudyDocumentLifecycleBaseSchema = z.object({
  studyId: PostgresUuidSchema,
  documentId: PostgresUuidSchema,
  name: z.string().min(3, 'Document name must be at least 3 characters').max(200).trim(),
  filePath: z.string().min(3, 'Document path is required').max(500).trim(),
  category: z.enum(STUDY_DOCUMENT_CATEGORIES),
})

export const UpdateStudyDocumentSchema = StudyDocumentLifecycleBaseSchema

export const CreateStudyDocumentVersionSchema = StudyDocumentLifecycleBaseSchema
