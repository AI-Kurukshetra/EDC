import { cache } from 'react'

import { z } from 'zod'

import { getCurrentSessionProfile } from '@/lib/queries/account'
import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  NOTIFICATION_TYPES,
  QUERY_PRIORITIES,
  STUDY_DOCUMENT_CATEGORIES,
  STUDY_STATUSES,
  USER_ROLES,
  type AdminSignatureSummary,
  type AdminUserSiteAssignment,
  type AdminWorkspace,
} from '@/types'

const ProfileRowSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
  created_at: z.string(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  protocol_number: z.string(),
  sponsor_id: PostgresUuidSchema,
  status: z.enum(STUDY_STATUSES),
})

const SubjectRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
})

const QueryRowSchema = z.object({
  id: PostgresUuidSchema,
  subject_id: PostgresUuidSchema,
  status: z.enum(['open', 'answered', 'closed', 'cancelled']),
  priority: z.enum(QUERY_PRIORITIES),
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const SiteUserRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
})

const NotificationRowSchema = z.object({
  user_id: PostgresUuidSchema,
  read_at: z.string().nullable(),
})

const AuditLogRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema.nullable(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  created_at: z.string(),
})

const RecentNotificationRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema,
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  message: z.string(),
  entity_id: z.string().nullable(),
  priority: z.enum(QUERY_PRIORITIES),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

const ExportRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  created_at: z.string(),
})

const StudyDocumentRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  file_path: z.string(),
  version: z.number().int().positive(),
  uploaded_by: PostgresUuidSchema.nullable(),
  category: z.enum(STUDY_DOCUMENT_CATEGORIES),
  created_at: z.string(),
})

const SignatureRowSchema = z.object({
  id: PostgresUuidSchema,
  entity_type: z.string(),
  entity_id: z.string(),
  signed_by: PostgresUuidSchema,
  signature_meaning: z.string(),
  signed_at: z.string(),
  created_at: z.string(),
  certificate_hash: z.string(),
})

function resolveAdminSignatureEntityContext(
  signature: z.infer<typeof SignatureRowSchema>,
  options: {
    documentsById: Map<string, z.infer<typeof StudyDocumentRowSchema>>
    exportsById: Map<string, z.infer<typeof ExportRowSchema>>
    profileById: Map<string, z.infer<typeof ProfileRowSchema>>
    siteById: Map<string, z.infer<typeof SiteRowSchema>>
    siteUsersById: Map<string, z.infer<typeof SiteUserRowSchema>>
    studyById: Map<string, z.infer<typeof StudyRowSchema>>
    subjectById: Map<string, z.infer<typeof SubjectRowSchema>>
  },
): Pick<AdminSignatureSummary, 'entityLabel' | 'entityContext'> {
  if (signature.entity_type === 'study') {
    const study = options.studyById.get(signature.entity_id)

    return {
      entityLabel: study?.title ?? null,
      entityContext: study?.protocol_number ?? null,
    }
  }

  if (signature.entity_type === 'study_document') {
    const document = options.documentsById.get(signature.entity_id)
    const study = document ? options.studyById.get(document.study_id) : null

    return {
      entityLabel: document?.name ?? null,
      entityContext:
        document && study
          ? `${study.protocol_number} • v${String(document.version)} • ${document.category.replaceAll('_', ' ')}`
          : null,
    }
  }

  if (signature.entity_type === 'data_export') {
    const exportRow = options.exportsById.get(signature.entity_id)
    const study = exportRow ? options.studyById.get(exportRow.study_id) : null

    return {
      entityLabel: study ? `${study.protocol_number} export` : null,
      entityContext: exportRow ? `status ${exportRow.status}` : null,
    }
  }

  if (signature.entity_type === 'profile') {
    const profile = options.profileById.get(signature.entity_id)

    return {
      entityLabel: profile?.full_name ?? null,
      entityContext: profile?.email ?? null,
    }
  }

  if (signature.entity_type === 'site_user') {
    const siteUser = options.siteUsersById.get(signature.entity_id)
    const site = siteUser ? options.siteById.get(siteUser.site_id) : null
    const assignee = siteUser ? options.profileById.get(siteUser.user_id) : null

    return {
      entityLabel: site ? `${site.site_code} assignment` : null,
      entityContext: assignee?.email ?? null,
    }
  }

  if (signature.entity_type === 'subject') {
    const subject = options.subjectById.get(signature.entity_id)
    const study = subject ? options.studyById.get(subject.study_id) : null

    return {
      entityLabel: subject?.id ?? null,
      entityContext: study?.protocol_number ?? null,
    }
  }

  return {
    entityLabel: null,
    entityContext: null,
  }
}

/** Loads the first platform-admin workspace slice for super admins. */
export const getAdminWorkspace = cache(async (): Promise<AdminWorkspace> => {
  const viewer = await getCurrentSessionProfile()

  if (viewer?.role !== 'super_admin') {
    return {
      isAuthorized: false,
      viewer,
    }
  }

  const supabase = await getServerSupabase()

  const [
    profilesResult,
    studiesResult,
    subjectsResult,
    queriesResult,
    siteUsersResult,
    sitesResult,
    notificationsResult,
    auditLogsResult,
    recentNotificationsResult,
    exportsResult,
    documentsResult,
    signaturesResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('studies').select('id, title, protocol_number, sponsor_id, status'),
    supabase.from('subjects').select('id, study_id'),
    supabase.from('queries').select('id, subject_id, status, priority'),
    supabase.from('site_users').select('id, user_id, site_id, role'),
    supabase.from('sites').select('id, study_id, name, site_code'),
    supabase.from('notifications').select('user_id, read_at'),
    supabase
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('notifications')
      .select('id, user_id, type, title, message, entity_id, priority, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('data_exports').select('id, study_id, status, created_at'),
    supabase
      .from('study_documents')
      .select('id, study_id, name, file_path, version, uploaded_by, category, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('signatures')
      .select(
        'id, entity_type, entity_id, signed_by, signature_meaning, signed_at, created_at, certificate_hash',
      )
      .order('signed_at', { ascending: false })
      .limit(20),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  if (studiesResult.error) {
    throw new Error(studiesResult.error.message)
  }

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message)
  }

  if (queriesResult.error) {
    throw new Error(queriesResult.error.message)
  }

  if (siteUsersResult.error) {
    throw new Error(siteUsersResult.error.message)
  }

  if (sitesResult.error) {
    throw new Error(sitesResult.error.message)
  }

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message)
  }

  if (auditLogsResult.error) {
    throw new Error(auditLogsResult.error.message)
  }

  if (recentNotificationsResult.error) {
    throw new Error(recentNotificationsResult.error.message)
  }

  if (exportsResult.error) {
    throw new Error(exportsResult.error.message)
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message)
  }

  if (signaturesResult.error) {
    throw new Error(signaturesResult.error.message)
  }

  const profiles = ProfileRowSchema.array().parse(profilesResult.data)
  const studies = StudyRowSchema.array().parse(studiesResult.data)
  const subjects = SubjectRowSchema.array().parse(subjectsResult.data)
  const queries = QueryRowSchema.array().parse(queriesResult.data)
  const siteUsers = SiteUserRowSchema.array().parse(siteUsersResult.data)
  const sites = SiteRowSchema.array().parse(sitesResult.data)
  const notifications = NotificationRowSchema.array().parse(notificationsResult.data)
  const auditLogs = AuditLogRowSchema.array().parse(auditLogsResult.data)
  const recentNotifications = RecentNotificationRowSchema.array().parse(
    recentNotificationsResult.data,
  )
  const exports = ExportRowSchema.array().parse(exportsResult.data)
  const documents = StudyDocumentRowSchema.array().parse(documentsResult.data)
  const signatures = SignatureRowSchema.array().parse(signaturesResult.data)

  const siteById = new Map(sites.map((site) => [site.id, site]))
  const studyById = new Map(studies.map((study) => [study.id, study]))
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]))
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const documentsById = new Map(documents.map((document) => [document.id, document]))
  const exportsById = new Map(exports.map((exportRow) => [exportRow.id, exportRow]))
  const siteUsersById = new Map(siteUsers.map((siteUser) => [siteUser.id, siteUser]))
  const siteAssignmentsByUserId = new Map<string, AdminUserSiteAssignment[]>()
  const sponsoredStudyCountByUserId = new Map<string, number>()
  const unreadNotificationsByUserId = new Map<string, number>()
  const siteCountByStudyId = new Map<string, number>()
  const subjectCountByStudyId = new Map<string, number>()
  const openQueryCountByStudyId = new Map<string, number>()
  const highPriorityOpenQueryCountByStudyId = new Map<string, number>()
  const exportsByStudyId = new Map<string, z.infer<typeof ExportRowSchema>[]>()

  for (const siteUser of siteUsers) {
    const site = siteById.get(siteUser.site_id)
    const study = site ? studyById.get(site.study_id) : null

    if (site && study) {
      const assignments = siteAssignmentsByUserId.get(siteUser.user_id) ?? []
      assignments.push({
        id: siteUser.id,
        siteId: site.id,
        siteName: site.name,
        siteCode: site.site_code,
        studyId: study.id,
        studyTitle: study.title,
        role: siteUser.role,
      })
      siteAssignmentsByUserId.set(siteUser.user_id, assignments)
    }
  }

  for (const study of studies) {
    sponsoredStudyCountByUserId.set(
      study.sponsor_id,
      (sponsoredStudyCountByUserId.get(study.sponsor_id) ?? 0) + 1,
    )
  }

  for (const site of sites) {
    siteCountByStudyId.set(site.study_id, (siteCountByStudyId.get(site.study_id) ?? 0) + 1)
  }

  for (const subject of subjects) {
    subjectCountByStudyId.set(
      subject.study_id,
      (subjectCountByStudyId.get(subject.study_id) ?? 0) + 1,
    )
  }

  for (const query of queries) {
    if (query.status !== 'open') {
      continue
    }

    const subject = subjectById.get(query.subject_id)

    if (!subject) {
      continue
    }

    openQueryCountByStudyId.set(
      subject.study_id,
      (openQueryCountByStudyId.get(subject.study_id) ?? 0) + 1,
    )

    if (query.priority === 'high') {
      highPriorityOpenQueryCountByStudyId.set(
        subject.study_id,
        (highPriorityOpenQueryCountByStudyId.get(subject.study_id) ?? 0) + 1,
      )
    }
  }

  for (const exportRow of exports) {
    const studyExports = exportsByStudyId.get(exportRow.study_id) ?? []
    studyExports.push(exportRow)
    exportsByStudyId.set(exportRow.study_id, studyExports)
  }

  for (const notification of notifications) {
    if (notification.read_at) {
      continue
    }

    unreadNotificationsByUserId.set(
      notification.user_id,
      (unreadNotificationsByUserId.get(notification.user_id) ?? 0) + 1,
    )
  }

  const roleDistribution = USER_ROLES.map((role) => ({
    role,
    count: profiles.filter((profile) => profile.role === role).length,
  })).filter((entry) => entry.count > 0)

  return {
    isAuthorized: true,
    viewer,
    totalUsers: profiles.length,
    activeUsers: profiles.filter((profile) => profile.is_active).length,
    totalStudies: studies.length,
    totalSiteAssignments: siteUsers.length,
    totalUnreadNotifications: notifications.filter((notification) => notification.read_at === null)
      .length,
    roleDistribution,
    users: profiles.map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      unreadNotificationCount: unreadNotificationsByUserId.get(profile.id) ?? 0,
      siteAssignmentCount: siteAssignmentsByUserId.get(profile.id)?.length ?? 0,
      sponsoredStudyCount: sponsoredStudyCountByUserId.get(profile.id) ?? 0,
      assignedSites:
        siteAssignmentsByUserId.get(profile.id)?.map((assignment) => assignment.siteCode) ?? [],
      siteAssignments: siteAssignmentsByUserId.get(profile.id) ?? [],
    })),
    recentAuditEvents: auditLogs.map((auditLog) => {
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
    }),
    studies: studies.map((study) => {
      const sponsor = profileById.get(study.sponsor_id)
      const studyExports = (exportsByStudyId.get(study.id) ?? []).sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      )
      const latestExport = studyExports[0] ?? null

      return {
        id: study.id,
        title: study.title,
        protocolNumber: study.protocol_number,
        status: study.status,
        sponsorId: study.sponsor_id,
        sponsorName: sponsor?.full_name ?? null,
        sponsorEmail: sponsor?.email ?? null,
        siteCount: siteCountByStudyId.get(study.id) ?? 0,
        subjectCount: subjectCountByStudyId.get(study.id) ?? 0,
        openQueryCount: openQueryCountByStudyId.get(study.id) ?? 0,
        highPriorityOpenQueryCount: highPriorityOpenQueryCountByStudyId.get(study.id) ?? 0,
        exportJobCount: studyExports.length,
        lastExportStatus: latestExport?.status ?? null,
        lastExportRequestedAt: latestExport?.created_at ?? null,
      }
    }),
    sites: sites.flatMap((site) => {
      const study = studies.find((studyRow) => studyRow.id === site.study_id)

      if (!study) {
        return []
      }

      return [
        {
          id: site.id,
          name: site.name,
          siteCode: site.site_code,
          studyId: study.id,
          studyTitle: study.title,
        },
      ]
    }),
    recentNotifications: recentNotifications.flatMap((notification) => {
      const recipient = profileById.get(notification.user_id)

      if (!recipient) {
        return []
      }

      return [
        {
          id: notification.id,
          userId: notification.user_id,
          recipientName: recipient.full_name,
          recipientEmail: recipient.email,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          entityId: notification.entity_id,
          priority: notification.priority,
          readAt: notification.read_at,
          createdAt: notification.created_at,
        },
      ]
    }),
    documents: documents.flatMap((document) => {
      const study = studyById.get(document.study_id)

      if (!study) {
        return []
      }

      const uploader = document.uploaded_by ? profileById.get(document.uploaded_by) : null

      return [
        {
          id: document.id,
          studyId: study.id,
          studyTitle: study.title,
          protocolNumber: study.protocol_number,
          name: document.name,
          filePath: document.file_path,
          version: document.version,
          category: document.category,
          uploadedByName: uploader?.full_name ?? null,
          uploadedByEmail: uploader?.email ?? null,
          createdAt: document.created_at,
        },
      ]
    }),
    signatures: signatures.flatMap((signature) => {
      const signer = profileById.get(signature.signed_by)
      const entity = resolveAdminSignatureEntityContext(signature, {
        documentsById,
        exportsById,
        profileById,
        siteById,
        siteUsersById,
        studyById,
        subjectById,
      })

      return [
        {
          id: signature.id,
          entityType: signature.entity_type,
          entityId: signature.entity_id,
          entityLabel: entity.entityLabel,
          entityContext: entity.entityContext,
          signatureMeaning: signature.signature_meaning,
          signedByName: signer?.full_name ?? null,
          signedByEmail: signer?.email ?? null,
          signedAt: signature.signed_at,
          createdAt: signature.created_at,
          certificateHash: signature.certificate_hash,
        },
      ]
    }),
  }
})
