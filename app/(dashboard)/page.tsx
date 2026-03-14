import { ClipboardList, FolderKanban, ShieldCheck, Users2 } from 'lucide-react'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardSnapshot } from '@/lib/queries/dashboard'
import { formatDateTime } from '@/lib/utils/format'

const ACTIVITY_ICONS = {
  'study.created': FolderKanban,
  'subject.enrolled': Users2,
  'query.created': ClipboardList,
  'signature.captured': ShieldCheck,
} as const

function isKnownActivityAction(action: string): action is keyof typeof ACTIVITY_ICONS {
  return action in ACTIVITY_ICONS
}

function getActivityIcon(action: string) {
  return isKnownActivityAction(action) ? ACTIVITY_ICONS[action] : FolderKanban
}

type DashboardPageProps = Record<string, never>

/** Summarizes portfolio metrics and recent audit activity for the signed-in user. */
export default async function DashboardPage(_props: DashboardPageProps) {
  const snapshot = await getDashboardSnapshot()

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active studies"
          value={snapshot.activeStudies}
          detail="Studies currently in execution or monitoring."
        />
        <StatCard
          label="Total subjects"
          value={snapshot.totalSubjects}
          detail="All enrolled, randomized, and completed participants."
          trend="up"
        />
        <StatCard
          label="Open queries"
          value={snapshot.openQueries}
          detail="Discrepancies that still need resolution across studies."
        />
        <StatCard
          label="Unread tasks"
          value={snapshot.pendingTasks}
          detail="Unread notifications, assignments, or pending workflow actions."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
              Operational view
            </p>
            <CardTitle>Recent platform activity</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.recentActivity.length === 0 ? (
              <EmptyState
                title="No recent audit events"
                description="Once users create studies, enroll subjects, or resolve queries, the live activity feed will populate here."
                actionHref="/studies/new"
                actionLabel="Create first study"
              />
            ) : (
              <div className="space-y-4">
                {snapshot.recentActivity.map((entry) => {
                  const Icon = getActivityIcon(entry.action)

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 rounded-2xl border border-[color:var(--color-gray-100)] bg-[color:var(--color-gray-50)] px-4 py-4"
                    >
                      <div className="rounded-2xl bg-[color:var(--color-navy-100)] p-3 text-[color:var(--color-navy-800)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[color:var(--color-gray-900)]">
                            {entry.action}
                          </p>
                          <Badge variant="muted">{entry.entityType}</Badge>
                        </div>
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                          {entry.entityId}
                        </p>
                      </div>
                      <p className="text-sm text-[color:var(--color-gray-600)]">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(238,245,251,0.9))]">
          <CardHeader>
            <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
              Readiness
            </p>
            <CardTitle>MVP build checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[color:var(--color-gray-700)]">
              {[
                'Supabase schema and RLS policies',
                'Auth and role-based route protection',
                'Study setup and multi-site assignment',
                'Dashboard visibility and audit instrumentation',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
