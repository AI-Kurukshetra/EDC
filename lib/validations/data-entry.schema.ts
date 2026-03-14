import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

export const SaveStudyDataEntrySchema = z.object({
  id: PostgresUuidSchema.optional(),
  studyId: PostgresUuidSchema,
  subjectId: PostgresUuidSchema,
  formTemplateId: PostgresUuidSchema,
  visitNumber: z.coerce.number().int().positive(),
  visitDate: z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  ),
  saveMode: z.enum(['draft', 'submit']),
  data: z.record(z.string(), z.unknown()),
})

export type SaveStudyDataEntryValues = z.input<typeof SaveStudyDataEntrySchema>
export type SaveStudyDataEntryInput = z.output<typeof SaveStudyDataEntrySchema>
