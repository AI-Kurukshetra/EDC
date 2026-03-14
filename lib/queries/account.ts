import { cache } from 'react'

import { z } from 'zod'

import { getAuthenticatedUser, getServerSupabase } from '@/lib/supabase/server'
import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  NOTIFICATION_TYPES,
  QUERY_PRIORITIES,
  STUDY_STATUSES,
  USER_ROLES,
  type AccountWorkspace,
  type SessionProfileSummary,
} from '@/types'

const ProfileRowSchema = z.object({
  id: PostgresUuidSchema,
  full_name: z.string(),
  email: z.email(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
  created_at: z.string(),
})

const SiteAssignmentRowSchema = z.object({
  id: PostgresUuidSchema,
  site_id: PostgresUuidSchema,
  role: z.enum(USER_ROLES),
})

const SiteRowSchema = z.object({
  id: PostgresUuidSchema,
  study_id: PostgresUuidSchema,
  name: z.string(),
  site_code: z.string(),
})

const StudyRowSchema = z.object({
  id: PostgresUuidSchema,
  title: z.string(),
  protocol_number: z.string(),
  status: z.enum(STUDY_STATUSES),
})

const NotificationRowSchema = z.object({
  id: PostgresUuidSchema,
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  message: z.string(),
  entity_id: z.string().nullable(),
  priority: z.enum(QUERY_PRIORITIES),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

function getExactCount(count: number | null) {
  return count ?? 0
}

function mapSessionProfile(
  profile: z.infer<typeof ProfileRowSchema>,
  unreadNotificationCount: number,
): SessionProfileSummary {
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    unreadNotificationCount,
  }
}

/** Loads the currently signed-in user's profile and unread notification count for the dashboard shell. */
export const getCurrentSessionProfile = cache(async (): Promise<SessionProfileSummary | null> => {
  const user = await getAuthenticatedUser()

  if (!user) {
    return null
  }

  const supabase = await getServerSupabase()

  const [profileResult, unreadNotificationsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ])

  if (profileResult.error) {
    throw new Error(profileResult.error.message)
  }

  if (!profileResult.data) {
    return null
  }

  const profile = ProfileRowSchema.parse(profileResult.data)

  return mapSessionProfile(profile, getExactCount(unreadNotificationsResult.count))
})

/** Loads the current user's account profile, sponsored studies, and site assignments. */
export const getAccountWorkspace = cache(async (): Promise<AccountWorkspace | null> => {
  const profile = await getCurrentSessionProfile()

  if (!profile) {
    return null
  }

  const supabase = await getServerSupabase()

  const [siteAssignmentsResult, sponsoredStudiesResult, notificationsResult] = await Promise.all([
    supabase.from('site_users').select('id, site_id, role').eq('user_id', profile.id),
    supabase
      .from('studies')
      .select('id, title, protocol_number, status')
      .eq('sponsor_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('id, type, title, message, entity_id, priority, read_at, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (siteAssignmentsResult.error) {
    throw new Error(siteAssignmentsResult.error.message)
  }

  if (sponsoredStudiesResult.error) {
    throw new Error(sponsoredStudiesResult.error.message)
  }

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message)
  }

  const siteAssignments = SiteAssignmentRowSchema.array().parse(siteAssignmentsResult.data)
  const siteIds = siteAssignments.map((assignment) => assignment.site_id)

  const sitesResult =
    siteIds.length > 0
      ? await supabase.from('sites').select('id, study_id, name, site_code').in('id', siteIds)
      : { data: [], error: null }

  if (sitesResult.error) {
    throw new Error(sitesResult.error.message)
  }

  const sites = SiteRowSchema.array().parse(sitesResult.data)
  const studyIds = [...new Set(sites.map((site) => site.study_id))]

  const assignmentStudiesResult =
    studyIds.length > 0
      ? await supabase
          .from('studies')
          .select('id, title, protocol_number, status')
          .in('id', studyIds)
      : { data: [], error: null }

  if (assignmentStudiesResult.error) {
    throw new Error(assignmentStudiesResult.error.message)
  }

  const siteById = new Map(sites.map((site) => [site.id, site]))
  const studyById = new Map(
    StudyRowSchema.array()
      .parse(assignmentStudiesResult.data)
      .map((study) => [study.id, study]),
  )

  return {
    profile,
    siteAssignments: siteAssignments.flatMap((assignment) => {
      const site = siteById.get(assignment.site_id)
      const study = site ? studyById.get(site.study_id) : null

      if (!site || !study) {
        return []
      }

      return [
        {
          id: assignment.id,
          siteId: site.id,
          siteName: site.name,
          siteCode: site.site_code,
          studyId: study.id,
          studyTitle: study.title,
          role: assignment.role,
        },
      ]
    }),
    sponsoredStudies: StudyRowSchema.array()
      .parse(sponsoredStudiesResult.data)
      .map((study) => ({
        id: study.id,
        title: study.title,
        protocolNumber: study.protocol_number,
        status: study.status,
      })),
    notifications: NotificationRowSchema.array()
      .parse(notificationsResult.data)
      .map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entityId: notification.entity_id,
        priority: notification.priority,
        readAt: notification.read_at,
        createdAt: notification.created_at,
      })),
  }
})
