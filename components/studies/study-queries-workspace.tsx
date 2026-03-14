import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsQuery } from '@/types'

const QUERY_STATUS_VARIANTS = {
  open: 'warning',
  answered: 'default',
  closed: 'success',
  cancelled: 'muted',
} as const

const QUERY_PRIORITY_VARIANTS = {
  low: 'muted',
  normal: 'default',
  high: 'danger',
} as const

type StudyQueriesWorkspaceProps = {
  queries: StudyOperationsQuery[]
}

/** Renders the study-level query queue with ownership, response, and form context. */
export function StudyQueriesWorkspace({ queries }: StudyQueriesWorkspaceProps) {
  if (queries.length === 0) {
    return (
      <EmptyState
        title="No queries raised yet"
        description="Once monitors or automated checks raise discrepancies, this queue will show assignment, priority, and response activity."
      />
    )
  }

  const openQueries = queries.filter((query) => query.status === 'open').length
  const highPriorityQueries = queries.filter((query) => query.priority === 'high').length
  const respondedQueries = queries.filter((query) => query.responseCount > 0).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Open queries"
          value={openQueries}
          detail="Queries that still require site or manager follow-up."
        />
        <StatCard
          label="High priority"
          value={highPriorityQueries}
          detail="Queries flagged for urgent review or source verification."
        />
        <StatCard
          label="With responses"
          value={respondedQueries}
          detail="Queries that already have at least one response recorded."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Study query queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queries.map((query) => (
            <div
              key={query.id}
              className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={QUERY_STATUS_VARIANTS[query.status]}>{query.status}</Badge>
                    <Badge variant={QUERY_PRIORITY_VARIANTS[query.priority]}>
                      {query.priority}
                    </Badge>
                    <Badge variant="muted">{query.formName}</Badge>
                    <Badge variant="muted">{query.fieldId}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--color-gray-800)]">
                    {query.queryText}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[22rem]">
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Subject
                    </p>
                    <p className="mt-1 font-medium">
                      {query.subjectLabel} • {query.siteCode}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Responses
                    </p>
                    <p className="mt-1 font-medium">{query.responseCount}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Raised by
                  </p>
                  <p className="mt-1 font-medium">{query.raisedByName ?? 'System generated'}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                    {query.raisedByEmail ?? 'No direct owner'}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Assigned to
                  </p>
                  <p className="mt-1 font-medium">{query.assignedToName ?? 'Unassigned'}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                    {query.assignedToEmail ?? 'Triaging required'}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Created
                  </p>
                  <p className="mt-1 font-medium">{formatDateTime(query.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Last response
                  </p>
                  <p className="mt-1 font-medium">{formatDateTime(query.lastResponseAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
