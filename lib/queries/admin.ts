import { cache } from 'react'

import { z } from 'zod'

import { getCurrentSessionProfile } from '@/lib/queries/account'
import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  NOTIFICATION_TYPES,
  QUERY_PRIORITIES,
  STUDY_STATUSES,
  USER_ROLES,
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
    siteUsersResult,
    sitesResult,
    notificationsResult,
    auditLogsResult,
    recentNotificationsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('studies').select('id, title, protocol_number, sponsor_id, status'),
    supabase.from('subjects').select('id, study_id'),
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

  const profiles = ProfileRowSchema.array().parse(profilesResult.data)
  const studies = StudyRowSchema.array().parse(studiesResult.data)
  const subjects = SubjectRowSchema.array().parse(subjectsResult.data)
  const siteUsers = SiteUserRowSchema.array().parse(siteUsersResult.data)
  const sites = SiteRowSchema.array().parse(sitesResult.data)
  const notifications = NotificationRowSchema.array().parse(notificationsResult.data)
  const auditLogs = AuditLogRowSchema.array().parse(auditLogsResult.data)
  const recentNotifications = RecentNotificationRowSchema.array().parse(
    recentNotificationsResult.data,
  )

  const siteById = new Map(sites.map((site) => [site.id, site]))
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const siteAssignmentsByUserId = new Map<string, AdminUserSiteAssignment[]>()
  const sponsoredStudyCountByUserId = new Map<string, number>()
  const unreadNotificationsByUserId = new Map<string, number>()
  const siteCountByStudyId = new Map<string, number>()
  const subjectCountByStudyId = new Map<string, number>()

  for (const siteUser of siteUsers) {
    const site = siteById.get(siteUser.site_id)
    const study = site ? studies.find((studyRow) => studyRow.id === site.study_id) : null

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
  }
})
