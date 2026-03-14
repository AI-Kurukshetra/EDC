import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_STATUSES } from '@/types'

export const UpdateAdminStudyGovernanceSchema = z.object({
  studyId: PostgresUuidSchema,
  sponsorId: PostgresUuidSchema,
  status: z.enum(STUDY_STATUSES),
})
