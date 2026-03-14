import { cache } from 'react'

import { z } from 'zod'

import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  DATA_ENTRY_STATUSES,
  QUERY_PRIORITIES,
  QUERY_STATUSES,
  SITE_STATUSES,
  SUBJECT_STATUSES,
  USER_ROLES,
  type StudyOperationsAudit,
  type StudyOperationsExport,
  type StudyOperationsExportWorkspace,
  type StudyOperationsQuery,
  type StudyOperationsSite,
  type StudyOperationsSubject,
  type StudyOperationsUser,
} from '@/types'

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  sponsor_id: PostgresUuidSchema,
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
  principal_investigator_id: PostgresUuidSchema.nullable(),
  country: z.string().nullable(),
  status: z.enum(SITE_STATUSES),
  created_at: z.string(),
})

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  subject_id: z.string(),
  status: z.enum(SUBJECT_STATUSES),
  consent_date: z.string().nullable(),
  enrollment_date: z.string().nullable(),
  withdrawal_date: z.string().nullable(),
  withdrawal_reason: z.string().nullable(),
  created_at: z.string(),
})

const SiteUserRowSchema = z.object({
  id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  user_id: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
  created_at: z.string(),
})

const ProfileRowSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
  created_at: z.string(),
})

const TemplateRowSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
  form_type: z.string(),
  version: z.number().int().positive(),
  is_published: z.boolean(),
})

const DataEntryRowSchema = z.object({
  id: PostgresUuidSchema,
  subject_id: PostgresUuidSchema,
  form_template_id: PostgresUuidSchema,
  visit_number: z.number().int().positive(),
  visit_date: z.string().nullable(),
  status: z.enum(DATA_ENTRY_STATUSES),
  submitted_by: PostgresUuidSchema.nullable(),
  submitted_at: z.string().nullable(),
  updated_at: z.string(),
})

const QueryRowSchema = z.object({
  id: PostgresUuidSchema,
  data_entry_id: PostgresUuidSchema,
  field_id: z.string(),
  subject_id: PostgresUuidSchema,
  query_text: z.string(),
  status: z.enum(QUERY_STATUSES),
  raised_by: PostgresUuidSchema.nullable(),
  assigned_to: PostgresUuidSchema.nullable(),
  priority: z.enum(QUERY_PRIORITIES),
  created_at: z.string(),
  updated_at: z.string(),
})

const QueryResponseRowSchema = z.object({
  id: PostgresUuidSchema,
  query_id: PostgresUuidSchema,
  responded_by: PostgresUuidSchema,
  created_at: z.string(),
})

const AuditLogRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema.nullable(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  created_at: z.string(),
})

const DataExportRowSchema = z.object({
  id: PostgresUuidSchema,
  requested_by: PostgresUuidSchema,
  format: z.enum(['csv', 'json', 'cdisc']),
  file_path: z.string().nullable(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  error_message: z.string().nullable(),
  completed_at: z.string().nullable(),
  signed_url_expires_at: z.string().nullable(),
  created_at: z.string(),
})

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message)
  }
}

function getLatestIsoTimestamp(values: (string | null)[]) {
  return values.reduce<string | null>((latest, value) => {
    if (!value) {
      return latest
    }

    if (!latest || value > latest) {
      return value
    }

    return latest
  }, null)
}

type StudyOperationsBase = {
  study: z.infer<typeof StudyRowSchema>
  sites: z.infer<typeof SiteRowSchema>[]
  subjects: z.infer<typeof SubjectRowSchema>[]
  siteUsers: z.infer<typeof SiteUserRowSchema>[]
  profiles: z.infer<typeof ProfileRowSchema>[]
  templates: z.infer<typeof TemplateRowSchema>[]
  entries: z.infer<typeof DataEntryRowSchema>[]
  queries: z.infer<typeof QueryRowSchema>[]
  queryResponses: z.infer<typeof QueryResponseRowSchema>[]
  auditLogs: z.infer<typeof AuditLogRowSchema>[]
  exports: z.infer<typeof DataExportRowSchema>[]
}

const getStudyOperationsBase = cache(async (studyId: string): Promise<StudyOperationsBase> => {
  const supabase = await getServerSupabase()

  const [
    studyResult,
    sitesResult,
    subjectsResult,
    templatesResult,
    exportsResult,
    auditLogsResult,
  ] = await Promise.all([
    supabase.from('studies').select('id, title, sponsor_id').eq('id', studyId).single(),
    supabase
      .from('sites')
      .select(
        'id, study_id, name, site_code, principal_investigator_id, country, status, created_at',
      )
      .eq('study_id', studyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('subjects')
      .select(
        'id, study_id, site_id, subject_id, status, consent_date, enrollment_date, withdrawal_date, withdrawal_reason, created_at',
      )
      .eq('study_id', studyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('form_templates')
      .select('id, name, form_type, version, is_published')
      .eq('study_id', studyId)
      .order('name', { ascending: true })
      .order('version', { ascending: true }),
    supabase
      .from('data_exports')
      .select(
        'id, requested_by, format, file_path, status, error_message, completed_at, signed_url_expires_at, created_at',
      )
      .eq('study_id', studyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  throwIfError(studyResult.error)
  throwIfError(sitesResult.error)
  throwIfError(subjectsResult.error)
  throwIfError(templatesResult.error)
  throwIfError(exportsResult.error)
  throwIfError(auditLogsResult.error)

  const study = StudyRowSchema.parse(studyResult.data)
  const sites = SiteRowSchema.array().parse(sitesResult.data)
  const subjects = SubjectRowSchema.array().parse(subjectsResult.data)
  const templates = TemplateRowSchema.array().parse(templatesResult.data)
  const exports = DataExportRowSchema.array().parse(exportsResult.data)
  const auditLogs = AuditLogRowSchema.array().parse(auditLogsResult.data)

  const siteIds = sites.map((site) => site.id)
  const subjectIds = subjects.map((subject) => subject.id)

  const [siteUsersResult, entriesResult, queriesResult] = await Promise.all([
    siteIds.length > 0
      ? supabase
          .from('site_users')
          .select('id, site_id, user_id, role, created_at')
          .in('site_id', siteIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    subjectIds.length > 0
      ? supabase
          .from('data_entries')
          .select(
            'id, subject_id, form_template_id, visit_number, visit_date, status, submitted_by, submitted_at, updated_at',
          )
          .in('subject_id', subjectIds)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    subjectIds.length > 0
      ? supabase
          .from('queries')
          .select(
            'id, data_entry_id, field_id, subject_id, query_text, status, raised_by, assigned_to, priority, created_at, updated_at',
          )
          .in('subject_id', subjectIds)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  throwIfError(siteUsersResult.error)
  throwIfError(entriesResult.error)
  throwIfError(queriesResult.error)

  const siteUsers = SiteUserRowSchema.array().parse(siteUsersResult.data)
  const entries = DataEntryRowSchema.array().parse(entriesResult.data)
  const queries = QueryRowSchema.array().parse(queriesResult.data)

  const queryIds = queries.map((query) => query.id)

  const queryResponsesResult =
    queryIds.length > 0
      ? await supabase
          .from('query_responses')
          .select('id, query_id, responded_by, created_at')
          .in('query_id', queryIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  throwIfError(queryResponsesResult.error)

  const queryResponses = QueryResponseRowSchema.array().parse(queryResponsesResult.data)

  const profileIds = new Set<string>([study.sponsor_id])

  for (const site of sites) {
    if (site.principal_investigator_id) {
      profileIds.add(site.principal_investigator_id)
    }
  }

  for (const siteUser of siteUsers) {
    profileIds.add(siteUser.user_id)
  }

  for (const entry of entries) {
    if (entry.submitted_by) {
      profileIds.add(entry.submitted_by)
    }
  }

  for (const query of queries) {
    if (query.raised_by) {
      profileIds.add(query.raised_by)
    }

    if (query.assigned_to) {
      profileIds.add(query.assigned_to)
    }
  }

  for (const response of queryResponses) {
    profileIds.add(response.responded_by)
  }

  for (const exportRow of exports) {
    profileIds.add(exportRow.requested_by)
  }

  for (const auditLog of auditLogs) {
    if (auditLog.user_id) {
      profileIds.add(auditLog.user_id)
    }
  }

  const profilesResult =
    profileIds.size > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, role, is_active, created_at')
          .in('id', [...profileIds])
      : { data: [], error: null }

  throwIfError(profilesResult.error)

  const profiles = ProfileRowSchema.array().parse(profilesResult.data)

  return {
    study,
    sites,
    subjects,
    siteUsers,
    profiles,
    templates,
    entries,
    queries,
    queryResponses,
    auditLogs,
    exports,
  }
})

function buildLookupMaps(data: StudyOperationsBase) {
  const siteById = new Map(data.sites.map((site) => [site.id, site]))
  const subjectById = new Map(data.subjects.map((subject) => [subject.id, subject]))
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]))
  const templateById = new Map(data.templates.map((template) => [template.id, template]))
  const entryById = new Map(data.entries.map((entry) => [entry.id, entry]))

  return {
    siteById,
    subjectById,
    profileById,
    templateById,
    entryById,
  }
}

export const getStudySubjectsWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsSubject[]> => {
    const data = await getStudyOperationsBase(studyId)
    const { siteById } = buildLookupMaps(data)

    const entriesBySubjectId = new Map<string, z.infer<typeof DataEntryRowSchema>[]>()
    const openQueriesBySubjectId = new Map<string, number>()

    for (const entry of data.entries) {
      const subjectEntries = entriesBySubjectId.get(entry.subject_id) ?? []
      subjectEntries.push(entry)
      entriesBySubjectId.set(entry.subject_id, subjectEntries)
    }

    for (const query of data.queries) {
      if (query.status !== 'open') {
        continue
      }

      openQueriesBySubjectId.set(
        query.subject_id,
        (openQueriesBySubjectId.get(query.subject_id) ?? 0) + 1,
      )
    }

    return data.subjects
      .map((subject) => {
        const site = siteById.get(subject.site_id)
        const subjectEntries = entriesBySubjectId.get(subject.id) ?? []

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
          siteCountry: site?.country ?? null,
          withdrawalDate: subject.withdrawal_date,
          withdrawalReason: subject.withdrawal_reason,
          entryCount: subjectEntries.length,
          submittedEntryCount: subjectEntries.filter((entry) =>
            ['submitted', 'locked', 'sdv_complete'].includes(entry.status),
          ).length,
          openQueryCount: openQueriesBySubjectId.get(subject.id) ?? 0,
          lastVisitDate: getLatestIsoTimestamp(subjectEntries.map((entry) => entry.visit_date)),
          lastSubmittedAt: getLatestIsoTimestamp(subjectEntries.map((entry) => entry.submitted_at)),
        }
      })
      .sort((left, right) => left.subjectId.localeCompare(right.subjectId))
  },
)

export const getStudyQueriesWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsQuery[]> => {
    const data = await getStudyOperationsBase(studyId)
    const { entryById, profileById, siteById, subjectById, templateById } = buildLookupMaps(data)

    const responseStatsByQueryId = new Map<
      string,
      { count: number; lastResponseAt: string | null }
    >()

    for (const response of data.queryResponses) {
      const existing = responseStatsByQueryId.get(response.query_id)

      if (!existing) {
        responseStatsByQueryId.set(response.query_id, {
          count: 1,
          lastResponseAt: response.created_at,
        })
        continue
      }

      responseStatsByQueryId.set(response.query_id, {
        count: existing.count + 1,
        lastResponseAt:
          !existing.lastResponseAt || response.created_at > existing.lastResponseAt
            ? response.created_at
            : existing.lastResponseAt,
      })
    }

    return data.queries.map((query) => {
      const subject = subjectById.get(query.subject_id)
      const site = subject ? siteById.get(subject.site_id) : null
      const entry = entryById.get(query.data_entry_id)
      const template = entry ? templateById.get(entry.form_template_id) : null
      const raisedBy = query.raised_by ? profileById.get(query.raised_by) : null
      const assignedTo = query.assigned_to ? profileById.get(query.assigned_to) : null
      const responseStats = responseStatsByQueryId.get(query.id)

      return {
        id: query.id,
        subjectId: query.subject_id,
        subjectLabel: subject?.subject_id ?? 'Unknown subject',
        siteName: site?.name ?? 'Unknown site',
        siteCode: site?.site_code ?? 'UNKNOWN',
        formName: template?.name ?? 'Unknown form',
        fieldId: query.field_id,
        queryText: query.query_text,
        status: query.status,
        priority: query.priority,
        raisedByName: raisedBy?.full_name ?? null,
        raisedByEmail: raisedBy?.email ?? null,
        assignedToName: assignedTo?.full_name ?? null,
        assignedToEmail: assignedTo?.email ?? null,
        responseCount: responseStats?.count ?? 0,
        lastResponseAt: responseStats?.lastResponseAt ?? null,
        createdAt: query.created_at,
        updatedAt: query.updated_at,
      }
    })
  },
)

export const getStudySitesWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsSite[]> => {
    const data = await getStudyOperationsBase(studyId)
    const { profileById } = buildLookupMaps(data)

    const subjectCountBySiteId = new Map<string, number>()
    const enrolledSubjectCountBySiteId = new Map<string, number>()
    const openQueryCountBySiteId = new Map<string, number>()
    const entryCountBySiteId = new Map<string, number>()
    const teamCountBySiteId = new Map<string, number>()
    const subjectSiteById = new Map(data.subjects.map((subject) => [subject.id, subject.site_id]))

    for (const subject of data.subjects) {
      subjectCountBySiteId.set(
        subject.site_id,
        (subjectCountBySiteId.get(subject.site_id) ?? 0) + 1,
      )

      if (['enrolled', 'randomized', 'completed'].includes(subject.status)) {
        enrolledSubjectCountBySiteId.set(
          subject.site_id,
          (enrolledSubjectCountBySiteId.get(subject.site_id) ?? 0) + 1,
        )
      }
    }

    for (const siteUser of data.siteUsers) {
      teamCountBySiteId.set(siteUser.site_id, (teamCountBySiteId.get(siteUser.site_id) ?? 0) + 1)
    }

    for (const entry of data.entries) {
      const siteId = subjectSiteById.get(entry.subject_id)

      if (!siteId) {
        continue
      }

      entryCountBySiteId.set(siteId, (entryCountBySiteId.get(siteId) ?? 0) + 1)
    }

    for (const query of data.queries) {
      if (query.status !== 'open') {
        continue
      }

      const siteId = subjectSiteById.get(query.subject_id)

      if (!siteId) {
        continue
      }

      openQueryCountBySiteId.set(siteId, (openQueryCountBySiteId.get(siteId) ?? 0) + 1)
    }

    return data.sites.map((site) => {
      const principalInvestigator = site.principal_investigator_id
        ? profileById.get(site.principal_investigator_id)
        : null

      return {
        id: site.id,
        name: site.name,
        siteCode: site.site_code,
        country: site.country,
        status: site.status,
        principalInvestigatorId: site.principal_investigator_id,
        principalInvestigatorName: principalInvestigator?.full_name ?? null,
        principalInvestigatorEmail: principalInvestigator?.email ?? null,
        teamSize: teamCountBySiteId.get(site.id) ?? 0,
        subjectCount: subjectCountBySiteId.get(site.id) ?? 0,
        enrolledSubjectCount: enrolledSubjectCountBySiteId.get(site.id) ?? 0,
        openQueryCount: openQueryCountBySiteId.get(site.id) ?? 0,
        entryCount: entryCountBySiteId.get(site.id) ?? 0,
        createdAt: site.created_at,
      }
    })
  },
)

export const getStudyUsersWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsUser[]> => {
    const data = await getStudyOperationsBase(studyId)
    const { profileById, siteById } = buildLookupMaps(data)

    const sponsor = profileById.get(data.study.sponsor_id)

    const assignments: StudyOperationsUser[] = sponsor
      ? [
          {
            id: `sponsor:${sponsor.id}`,
            userId: sponsor.id,
            fullName: sponsor.full_name,
            email: sponsor.email,
            siteId: null,
            siteName: null,
            siteCode: null,
            siteRole: 'sponsor',
            profileRole: sponsor.role,
            isActive: sponsor.is_active,
            assignedAt: sponsor.created_at,
          },
        ]
      : []

    for (const siteUser of data.siteUsers) {
      const profile = profileById.get(siteUser.user_id)
      const site = siteById.get(siteUser.site_id)

      if (!profile || !site) {
        continue
      }

      assignments.push({
        id: siteUser.id,
        userId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        siteId: site.id,
        siteName: site.name,
        siteCode: site.site_code,
        siteRole: siteUser.role,
        profileRole: profile.role,
        isActive: profile.is_active,
        assignedAt: siteUser.created_at,
      })
    }

    return assignments.sort((left, right) => {
      const siteOrder = (left.siteCode ?? 'CORE').localeCompare(right.siteCode ?? 'CORE')
      return siteOrder === 0 ? left.fullName.localeCompare(right.fullName) : siteOrder
    })
  },
)

export const getStudyAuditWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsAudit[]> => {
    const data = await getStudyOperationsBase(studyId)
    const { profileById } = buildLookupMaps(data)

    const relevantEntityIds = new Set<string>([data.study.id])

    for (const site of data.sites) {
      relevantEntityIds.add(site.id)
    }

    for (const subject of data.subjects) {
      relevantEntityIds.add(subject.id)
    }

    for (const template of data.templates) {
      relevantEntityIds.add(template.id)
    }

    for (const entry of data.entries) {
      relevantEntityIds.add(entry.id)
    }

    for (const query of data.queries) {
      relevantEntityIds.add(query.id)
    }

    for (const exportRow of data.exports) {
      relevantEntityIds.add(exportRow.id)
    }

    return data.auditLogs
      .filter((auditLog) => relevantEntityIds.has(auditLog.entity_id))
      .map((auditLog) => {
        const actor = auditLog.user_id ? profileById.get(auditLog.user_id) : null

        return {
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entity_type,
          entityId: auditLog.entity_id,
          actorName: actor?.full_name ?? null,
          actorEmail: actor?.email ?? null,
          createdAt: auditLog.created_at,
        }
      })
  },
)

export const getStudyExportWorkspace = cache(
  async (studyId: string): Promise<StudyOperationsExportWorkspace> => {
    const data = await getStudyOperationsBase(studyId)
    const { profileById } = buildLookupMaps(data)

    const openQueryCount = data.queries.filter((query) => query.status === 'open').length

    const exports: StudyOperationsExport[] = data.exports.map((exportRow) => {
      const requestedBy = profileById.get(exportRow.requested_by)

      return {
        id: exportRow.id,
        format: exportRow.format,
        status: exportRow.status,
        requestedByName: requestedBy?.full_name ?? null,
        requestedByEmail: requestedBy?.email ?? null,
        filePath: exportRow.file_path,
        errorMessage: exportRow.error_message,
        completedAt: exportRow.completed_at,
        signedUrlExpiresAt: exportRow.signed_url_expires_at,
        createdAt: exportRow.created_at,
      }
    })

    return {
      studyId: data.study.id,
      studyTitle: data.study.title,
      subjectCount: data.subjects.length,
      formCount: data.templates.filter((template) => template.is_published).length,
      entryCount: data.entries.length,
      openQueryCount,
      sites: data.sites.map((site) => ({
        id: site.id,
        name: site.name,
        siteCode: site.site_code,
      })),
      forms: data.templates
        .filter((template) => template.is_published)
        .map((template) => ({
          id: template.id,
          name: template.name,
          label: `${template.name} • v${String(template.version)}`,
        })),
      exports,
    }
  },
)
