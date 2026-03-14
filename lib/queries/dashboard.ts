import { cache } from 'react'

import { getServerSupabase } from '@/lib/supabase/server'
import type { DashboardSnapshot } from '@/types'

function getExactCount(count: number | null): number {
  return count ?? 0
}

export const getDashboardSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  const supabase = await getServerSupabase()

  const [
    activeStudiesResult,
    totalSubjectsResult,
    openQueriesResult,
    pendingTasksResult,
    activityResult,
  ] = await Promise.all([
    supabase.from('studies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('queries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (activityResult.error) {
    throw new Error(activityResult.error.message)
  }

  return {
    activeStudies: getExactCount(activeStudiesResult.count),
    totalSubjects: getExactCount(totalSubjectsResult.count),
    openQueries: getExactCount(openQueriesResult.count),
    pendingTasks: getExactCount(pendingTasksResult.count),
    recentActivity: activityResult.data.map((entry) => ({
      id: String(entry.id),
      action: String(entry.action),
      entityType: String(entry.entity_type),
      entityId: String(entry.entity_id),
      createdAt: String(entry.created_at),
    })),
  }
})
