import { cache } from 'react'

import { z } from 'zod'

import { getCurrentSessionProfile } from '@/lib/queries/account'
import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { type StudyFilters, StudyFiltersSchema } from '@/lib/validations/study.schema'
import {
  STUDY_SIGNATURE_MEANINGS,
  USER_ROLES,
  type StudyDetail,
  type StudyOverviewWorkspace,
  type StudySummary,
} from '@/types'

const StudySummaryRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  protocol_number: z.string(),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV']),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'terminated']),
  sponsor_id: PostgresUuidSchema.nullable(),
  target_enrollment: z.number().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  therapeutic_area: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
  country: z.string().nullable(),
  status: z.enum(['pending', 'active', 'closed']),
  principal_investigator_id: PostgresUuidSchema.nullable(),
  created_at: z.string(),
})

const StudyDetailRowSchema = StudySummaryRowSchema.extend({
  description: z.string().nullable(),
})

const StudySignatureRowSchema = z.object({
  id: PostgresUuidSchema,
  signed_by: PostgresUuidSchema,
  signature_meaning: z.enum(STUDY_SIGNATURE_MEANINGS),
  signed_at: z.string(),
  created_at: z.string(),
  certificate_hash: z.string(),
})

const SignatureProfileRowSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
})

function getExactCount(count: number | null): number {
  return count ?? 0
}

function mapStudySummary(row: z.infer<typeof StudySummaryRowSchema>): StudySummary {
  return {
    id: row.id,
    title: row.title,
    protocolNumber: row.protocol_number,
    phase: row.phase,
    status: row.status,
    sponsorId: row.sponsor_id,
    targetEnrollment: row.target_enrollment,
    startDate: row.start_date,
    endDate: row.end_date,
    therapeuticArea: row.therapeutic_area,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const getStudies = cache(async (filters?: StudyFilters): Promise<StudySummary[]> => {
  const parsed = StudyFiltersSchema.safeParse(filters ?? {})

  if (!parsed.success) {
    throw new Error('Invalid study filters.')
  }

  const supabase = await getServerSupabase()
  let query = supabase
    .from('studies')
    .select(
      'id, title, protocol_number, phase, status, sponsor_id, target_enrollment, start_date, end_date, therapeutic_area, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (parsed.data.search) {
    query = query.or(
      `title.ilike.%${parsed.data.search}%,protocol_number.ilike.%${parsed.data.search}%`,
    )
  }

  if (parsed.data.phase) {
    query = query.eq('phase', parsed.data.phase)
  }

  if (parsed.data.status) {
    query = query.eq('status', parsed.data.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return StudySummaryRowSchema.array().parse(data).map(mapStudySummary)
})

export const getStudyDetail = cache(async (studyId: string): Promise<StudyDetail | null> => {
  const supabase = await getServerSupabase()

  const [studyResult, sitesResult, subjectRowsResult] = await Promise.all([
    supabase
      .from('studies')
      .select(
        'id, title, protocol_number, phase, status, sponsor_id, target_enrollment, start_date, end_date, therapeutic_area, created_at, updated_at, description',
      )
      .eq('id', studyId)
      .single(),
    supabase
      .from('sites')
      .select('id, name, site_code, country, status, principal_investigator_id, created_at')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true }),
    supabase.from('subjects').select('id, status').eq('study_id', studyId),
  ])

  if (studyResult.error && studyResult.error.code !== 'PGRST116') {
    throw new Error(studyResult.error.message)
  }

  if (!studyResult.data) {
    return null
  }

  if (sitesResult.error) {
    throw new Error(sitesResult.error.message)
  }

  if (subjectRowsResult.error) {
    throw new Error(subjectRowsResult.error.message)
  }

  const subjectIds = subjectRowsResult.data.map((subject) => String(subject.id))
  const enrolledSubjects = subjectRowsResult.data.filter((subject) =>
    ['enrolled', 'randomized', 'completed'].includes(String(subject.status)),
  ).length

  let openQueryCount = 0
  let entryCount = 0
  let completedCount = 0

  if (subjectIds.length > 0) {
    const [openQueryResult, entryResult, completedResult] = await Promise.all([
      supabase
        .from('queries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .in('subject_id', subjectIds),
      supabase
        .from('data_entries')
        .select('id', { count: 'exact', head: true })
        .in('subject_id', subjectIds),
      supabase
        .from('data_entries')
        .select('id', { count: 'exact', head: true })
        .in('subject_id', subjectIds)
        .in('status', ['submitted', 'locked', 'sdv_complete']),
    ])

    openQueryCount = getExactCount(openQueryResult.count)
    entryCount = getExactCount(entryResult.count)
    completedCount = getExactCount(completedResult.count)
  }

  const parsedStudy = StudyDetailRowSchema.parse(studyResult.data)
  const parsedSites = SiteRowSchema.array().parse(sitesResult.data)
  const totalEntries = entryCount
  const completedEntries = completedCount

  return {
    ...mapStudySummary(parsedStudy),
    description: parsedStudy.description,
    sites: parsedSites.map((site) => ({
      id: site.id,
      name: site.name,
      siteCode: site.site_code,
      country: site.country,
      status: site.status,
      principalInvestigatorId: site.principal_investigator_id,
      createdAt: site.created_at,
    })),
    openQueries: openQueryCount,
    enrolledSubjects,
    completionRate: totalEntries === 0 ? 0 : (completedEntries / totalEntries) * 100,
  }
})

export const getStudyOverviewWorkspace = cache(
  async (studyId: string): Promise<StudyOverviewWorkspace | null> => {
    const study = await getStudyDetail(studyId)

    if (!study) {
      return null
    }

    const supabase = await getServerSupabase()
    const [viewer, signaturesResult] = await Promise.all([
      getCurrentSessionProfile(),
      supabase
        .from('signatures')
        .select('id, signed_by, signature_meaning, signed_at, created_at, certificate_hash')
        .eq('entity_type', 'study')
        .eq('entity_id', studyId)
        .order('signed_at', { ascending: false }),
    ])

    if (signaturesResult.error) {
      throw new Error(signaturesResult.error.message)
    }

    const signatures = StudySignatureRowSchema.array().parse(signaturesResult.data)
    const signerIds = [...new Set(signatures.map((signature) => signature.signed_by))]

    const signerProfilesResult =
      signerIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, email, role').in('id', signerIds)
        : { data: [], error: null }

    if (signerProfilesResult.error) {
      throw new Error(signerProfilesResult.error.message)
    }

    const signerProfiles = SignatureProfileRowSchema.array().parse(signerProfilesResult.data)
    const signerById = new Map(signerProfiles.map((profile) => [profile.id, profile]))

    return {
      study,
      canSignStudy:
        viewer?.isActive === true &&
        (viewer.id === study.sponsorId ||
          viewer.role === 'super_admin' ||
          viewer.role === 'data_manager' ||
          viewer.role === 'monitor'),
      viewerName: viewer?.fullName ?? null,
      viewerEmail: viewer?.email ?? null,
      viewerRole: viewer?.role ?? null,
      signatures: signatures.map((signature) => {
        const signer = signerById.get(signature.signed_by)

        return {
          id: signature.id,
          signatureMeaning: signature.signature_meaning,
          signedAt: signature.signed_at,
          createdAt: signature.created_at,
          certificateHash: signature.certificate_hash,
          signedByName: signer?.full_name ?? null,
          signedByEmail: signer?.email ?? null,
          signedByRole: signer?.role ?? null,
        }
      }),
    }
  },
)
