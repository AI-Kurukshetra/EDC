import { cache } from 'react'

import { z } from 'zod'

import { getCurrentSessionProfile } from '@/lib/queries/account'
import { getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import { STUDY_STATUSES, USER_ROLES, type AdminWorkspace } from '@/types'

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
  sponsor_id: PostgresUuidSchema,
  status: z.enum(STUDY_STATUSES),
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const SiteUserRowSchema = z.object({
  id: PostgresUuidSchema,
  user_id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
})

const NotificationRowSchema = z.object({
  user_id: PostgresUuidSchema,
  read_at: z.string().nullable(),
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

  const [profilesResult, studiesResult, siteUsersResult, sitesResult, notificationsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('studies').select('id, sponsor_id, status'),
      supabase.from('site_users').select('id, user_id, site_id'),
      supabase.from('sites').select('id, name, site_code'),
      supabase.from('notifications').select('user_id, read_at'),
    ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  if (studiesResult.error) {
    throw new Error(studiesResult.error.message)
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

  const profiles = ProfileRowSchema.array().parse(profilesResult.data)
  const studies = StudyRowSchema.array().parse(studiesResult.data)
  const siteUsers = SiteUserRowSchema.array().parse(siteUsersResult.data)
  const sites = SiteRowSchema.array().parse(sitesResult.data)
  const notifications = NotificationRowSchema.array().parse(notificationsResult.data)

  const siteById = new Map(sites.map((site) => [site.id, site]))
  const siteAssignmentsByUserId = new Map<string, string[]>()
  const sponsoredStudyCountByUserId = new Map<string, number>()
  const unreadNotificationsByUserId = new Map<string, number>()

  for (const siteUser of siteUsers) {
    const assignedSites = siteAssignmentsByUserId.get(siteUser.user_id) ?? []
    const site = siteById.get(siteUser.site_id)

    if (site) {
      assignedSites.push(site.site_code)
      siteAssignmentsByUserId.set(siteUser.user_id, assignedSites)
    }
  }

  for (const study of studies) {
    sponsoredStudyCountByUserId.set(
      study.sponsor_id,
      (sponsoredStudyCountByUserId.get(study.sponsor_id) ?? 0) + 1,
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
      assignedSites: siteAssignmentsByUserId.get(profile.id) ?? [],
    })),
  }
})
