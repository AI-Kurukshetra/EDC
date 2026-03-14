import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_PHASES, USER_ROLES } from '@/types'

export const SiteDraftSchema = z.object({
  name: z.string().min(2, 'Site name is required'),
  siteCode: z
    .string()
    .min(2, 'Site code is required')
    .max(12, 'Site code must be 12 characters or fewer')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, or dashes only'),
  country: z.string().min(2, 'Country is required'),
  principalInvestigatorId: PostgresUuidSchema.optional(),
})

export const TeamAssignmentSchema = z.object({
  userId: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
  siteCode: z.string().min(1, 'Select a site for each assignment'),
})

export const CreateStudySchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
    protocolNumber: z
      .string()
      .min(3, 'Protocol number is required')
      .regex(/^[A-Z]{2,8}-\d{2,6}$/, 'Use a protocol format like CDH-001 or ONCO-2026'),
    phase: z.enum(STUDY_PHASES),
    description: z.string().max(2000, 'Description must be under 2000 characters').optional(),
    therapeuticArea: z.string().max(120).optional(),
    targetEnrollment: z.coerce.number().int().positive().max(50000).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sites: z.array(SiteDraftSchema).min(1, 'Add at least one site'),
    teamAssignments: z.array(TeamAssignmentSchema),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })

export type CreateStudyFormValues = z.input<typeof CreateStudySchema>
export type CreateStudyInput = z.infer<typeof CreateStudySchema>

export const StudyFiltersSchema = z.object({
  search: z.string().optional(),
  phase: z.enum(STUDY_PHASES).optional(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'terminated']).optional(),
})

export type StudyFilters = z.infer<typeof StudyFiltersSchema>
