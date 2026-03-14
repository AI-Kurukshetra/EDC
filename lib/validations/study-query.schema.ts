import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { QUERY_STATUSES } from '@/types'

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export const UpdateStudyQuerySchema = z
  .object({
    studyId: PostgresUuidSchema,
    queryId: PostgresUuidSchema,
    nextStatus: z.enum(QUERY_STATUSES),
    assignedToId: z.preprocess(normalizeNullableText, PostgresUuidSchema.nullable()),
    responseText: z.preprocess(normalizeOptionalText, z.string().max(4000).optional()),
    actionTaken: z.preprocess(normalizeOptionalText, z.string().max(2000).optional()),
  })
  .superRefine((data, context) => {
    const hasResponseContent = Boolean(data.responseText ?? data.actionTaken)

    if (['answered', 'closed', 'cancelled'].includes(data.nextStatus) && !hasResponseContent) {
      context.addIssue({
        code: 'custom',
        message: 'Provide a response or action summary before updating this query status.',
        path: ['responseText'],
      })
    }
  })
