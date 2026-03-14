import { cache } from 'react'

import { z } from 'zod'

import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { CrfSchemaSchema, VisitScheduleSchema } from '@/lib/validations/form-template.schema'
import { FORM_TEMPLATE_TYPES, type StudyFormTemplate } from '@/types'

const FormTemplateRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  form_type: z.enum(FORM_TEMPLATE_TYPES),
  version: z.number().int().positive(),
  is_published: z.boolean(),
  schema: z.unknown(),
  visit_schedule: z.unknown().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

function mapFormTemplate(row: z.infer<typeof FormTemplateRowSchema>): StudyFormTemplate {
  return {
    id: row.id,
    studyId: row.study_id,
    name: row.name,
    formType: row.form_type,
    version: row.version,
    isPublished: row.is_published,
    schema: CrfSchemaSchema.parse(row.schema),
    visitSchedule: row.visit_schedule ? VisitScheduleSchema.parse(row.visit_schedule) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const getStudyFormTemplates = cache(
  async (studyId: string): Promise<StudyFormTemplate[]> => {
    const supabase = await getServerSupabase()
    const { data, error } = await supabase
      .from('form_templates')
      .select(
        'id, study_id, name, form_type, version, is_published, schema, visit_schedule, created_at, updated_at',
      )
      .eq('study_id', studyId)
      .order('name', { ascending: true })
      .order('version', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return FormTemplateRowSchema.array().parse(data).map(mapFormTemplate)
  },
)
