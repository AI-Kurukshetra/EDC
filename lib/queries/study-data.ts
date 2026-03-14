import { cache } from 'react'

import { z } from 'zod'

import { getStudyFormTemplates } from '@/lib/queries/form-templates'
import { getServerSupabase } from '@/lib/supabase/server'
import { normalizeCrfEntryRecord } from '@/lib/utils/crf-entry'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  DATA_ENTRY_STATUSES,
  QUERY_PRIORITIES,
  QUERY_STATUSES,
  SUBJECT_STATUSES,
  type StudyDataWorkspace,
} from '@/types'

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  subject_id: z.string(),
  status: z.enum(SUBJECT_STATUSES),
  consent_date: z.string().nullable(),
  enrollment_date: z.string().nullable(),
  created_at: z.string(),
})

const SiteLookupRowSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const DataEntryRowSchema = z.object({
  id: PostgresUuidSchema,
  subject_id: PostgresUuidSchema,
  form_template_id: PostgresUuidSchema,
  visit_number: z.number().int().positive(),
  visit_date: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(DATA_ENTRY_STATUSES),
  submitted_by: PostgresUuidSchema.nullable(),
  submitted_at: z.string().nullable(),
  locked_by: PostgresUuidSchema.nullable(),
  locked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const QueryRowSchema = z.object({
  id: PostgresUuidSchema,
  data_entry_id: PostgresUuidSchema,
  field_id: z.string(),
  subject_id: PostgresUuidSchema,
  query_text: z.string(),
  status: z.enum(QUERY_STATUSES),
  priority: z.enum(QUERY_PRIORITIES),
  assigned_to: PostgresUuidSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

/** Loads the subject roster, published CRFs, saved entries, and field queries for study data entry. */
export const getStudyDataWorkspace = cache(async (studyId: string): Promise<StudyDataWorkspace> => {
  const supabase = await getServerSupabase()

  const [templates, subjectsResult, sitesResult] = await Promise.all([
    getStudyFormTemplates(studyId),
    supabase
      .from('subjects')
      .select('id, site_id, subject_id, status, consent_date, enrollment_date, created_at')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('sites')
      .select('id, name, site_code')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true }),
  ])

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message)
  }

  if (sitesResult.error) {
    throw new Error(sitesResult.error.message)
  }

  const publishedTemplates = templates.filter((template) => template.isPublished)
  const templateById = new Map(publishedTemplates.map((template) => [template.id, template]))
  const subjectRows = SubjectRowSchema.array().parse(subjectsResult.data)
  const siteRows = SiteLookupRowSchema.array().parse(sitesResult.data)
  const siteById = new Map(siteRows.map((site) => [site.id, site]))

  const subjects = subjectRows.map((subject) => {
    const site = siteById.get(subject.site_id)

    return {
      id: subject.id,
      siteId: subject.site_id,
      subjectId: subject.subject_id,
      status: subject.status,
      siteName: site?.name ?? 'Unknown site',
      siteCode: site?.site_code ?? 'UNKNOWN',
      consentDate: subject.consent_date,
      enrollmentDate: subject.enrollment_date,
      createdAt: subject.created_at,
    }
  })

  if (subjects.length === 0 || publishedTemplates.length === 0) {
    return {
      subjects,
      templates: publishedTemplates,
      entries: [],
      queries: [],
    }
  }

  const subjectIds = subjects.map((subject) => subject.id)
  const templateIds = publishedTemplates.map((template) => template.id)

  const [entriesResult, queriesResult] = await Promise.all([
    supabase
      .from('data_entries')
      .select(
        'id, subject_id, form_template_id, visit_number, visit_date, data, status, submitted_by, submitted_at, locked_by, locked_at, created_at, updated_at',
      )
      .in('subject_id', subjectIds)
      .in('form_template_id', templateIds)
      .order('subject_id', { ascending: true })
      .order('form_template_id', { ascending: true })
      .order('visit_number', { ascending: true }),
    supabase
      .from('queries')
      .select(
        'id, data_entry_id, field_id, subject_id, query_text, status, priority, assigned_to, created_at, updated_at',
      )
      .in('subject_id', subjectIds)
      .order('updated_at', { ascending: false }),
  ])

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message)
  }

  if (queriesResult.error) {
    throw new Error(queriesResult.error.message)
  }

  return {
    subjects,
    templates: publishedTemplates,
    entries: DataEntryRowSchema.array()
      .parse(entriesResult.data)
      .map((entry) => ({
        id: entry.id,
        subjectId: entry.subject_id,
        formTemplateId: entry.form_template_id,
        visitNumber: entry.visit_number,
        visitDate: entry.visit_date,
        data: normalizeCrfEntryRecord(
          templateById.get(entry.form_template_id)?.schema.fields ?? [],
          entry.data,
        ),
        status: entry.status,
        submittedBy: entry.submitted_by,
        submittedAt: entry.submitted_at,
        lockedBy: entry.locked_by,
        lockedAt: entry.locked_at,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      })),
    queries: QueryRowSchema.array()
      .parse(queriesResult.data)
      .map((query) => ({
        id: query.id,
        dataEntryId: query.data_entry_id,
        fieldId: query.field_id,
        subjectId: query.subject_id,
        queryText: query.query_text,
        status: query.status,
        priority: query.priority,
        assignedTo: query.assigned_to,
        createdAt: query.created_at,
        updatedAt: query.updated_at,
      })),
  }
})
