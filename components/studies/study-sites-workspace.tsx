import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import type { StudyOperationsSite } from '@/types'

const SITE_STATUS_VARIANTS = {
  pending: 'warning',
  active: 'success',
  closed: 'muted',
} as const

type StudySitesWorkspaceProps = {
  sites: StudyOperationsSite[]
}

/** Summarizes site activation, staffing, enrollment, and data-capture load for a study. */
export function StudySitesWorkspace({ sites }: StudySitesWorkspaceProps) {
  if (sites.length === 0) {
    return (
      <EmptyState
        title="No sites configured"
        description="Once study sites are assigned, this workspace will track activation, PI ownership, staffing, and site-level workload."
      />
    )
  }

  const openQueries = sites.reduce((count, site) => count + site.openQueryCount, 0)
  const subjects = sites.reduce((count, site) => count + site.subjectCount, 0)
  const activeSites = sites.filter((site) => site.status === 'active').length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Sites"
          value={sites.length}
          detail="All configured study sites, including pending and closed locations."
        />
        <StatCard
          label="Active sites"
          value={activeSites}
          detail="Sites currently able to enroll subjects and enter data."
        />
        <StatCard
          label="Open queries"
          value={openQueries}
          detail="Current query backlog across all participating sites."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Site operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--color-gray-900)]">{site.name}</p>
                    <Badge variant={SITE_STATUS_VARIANTS[site.status]}>{site.status}</Badge>
                    <Badge variant="muted">{site.siteCode}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                    {site.country ?? 'Country not captured'} • Activated{' '}
                    {formatDate(site.createdAt)}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[20rem]">
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Principal investigator
                    </p>
                    <p className="mt-1 font-medium">
                      {site.principalInvestigatorName ?? 'Unassigned'}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                      {site.principalInvestigatorEmail ?? 'Assign a PI to complete oversight setup'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Team size
                    </p>
                    <p className="mt-1 font-medium">{site.teamSize} assigned users</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Subjects
                  </p>
                  <p className="mt-1 font-medium">{site.subjectCount}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Enrolled
                  </p>
                  <p className="mt-1 font-medium">{site.enrolledSubjectCount}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Entries
                  </p>
                  <p className="mt-1 font-medium">{site.entryCount}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Open queries
                  </p>
                  <p className="mt-1 font-medium">{site.openQueryCount}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network load</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Total subjects
            </p>
            <p className="mt-2 text-3xl font-semibold">{subjects}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Average team size
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {Math.round(
                (sites.reduce((count, site) => count + site.teamSize, 0) / sites.length) * 10,
              ) / 10}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Average queries
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {Math.round((openQueries / sites.length) * 10) / 10}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
