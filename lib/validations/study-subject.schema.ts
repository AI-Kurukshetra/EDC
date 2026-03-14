import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { SUBJECT_STATUSES } from '@/types'

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

export const CreateStudySubjectSchema = z.object({
  studyId: PostgresUuidSchema,
  siteId: PostgresUuidSchema,
  subjectId: z
    .string()
    .min(2, 'Subject identifier is required')
    .max(32, 'Subject identifier must be 32 characters or fewer')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, or dashes only'),
  status: z.enum(SUBJECT_STATUSES),
  consentDate: z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  ),
  enrollmentDate: z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  ),
})

export const UpdateStudySubjectSchema = z
  .object({
    studyId: PostgresUuidSchema,
    subjectId: PostgresUuidSchema,
    status: z.enum(SUBJECT_STATUSES),
    consentDate: z.preprocess(
      normalizeOptionalText,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
    enrollmentDate: z.preprocess(
      normalizeOptionalText,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
    withdrawalDate: z.preprocess(
      normalizeOptionalText,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
    withdrawalReason: z.preprocess(normalizeOptionalText, z.string().max(2000).optional()),
  })
  .superRefine((data, context) => {
    const needsWithdrawalDetails = data.status === 'withdrawn'

    if (needsWithdrawalDetails && !data.withdrawalDate) {
      context.addIssue({
        code: 'custom',
        message: 'Withdrawal date is required when a subject is withdrawn.',
        path: ['withdrawalDate'],
      })
    }

    if (needsWithdrawalDetails && !data.withdrawalReason) {
      context.addIssue({
        code: 'custom',
        message: 'Withdrawal reason is required when a subject is withdrawn.',
        path: ['withdrawalReason'],
      })
    }
  })
