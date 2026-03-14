import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsAudit } from '@/types'

type StudyAuditWorkspaceProps = {
  events: StudyOperationsAudit[]
}

/** Displays the study-scoped audit trail available to oversight roles in Phase 1. */
export function StudyAuditWorkspace({ events }: StudyAuditWorkspaceProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No study audit events available"
        description="Audit entries will appear here as data entry, export, and oversight actions are recorded for this study."
      />
    )
  }

  const distinctActions = new Set(events.map((event) => event.action)).size
  const distinctActors = new Set(
    events.map((event) => event.actorEmail ?? event.actorName ?? 'system'),
  ).size

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Audit events"
          value={events.length}
          detail="Recent study-scoped activity captured in the audit trail."
        />
        <StatCard
          label="Action types"
          value={distinctActions}
          detail="Distinct workflow actions represented in the current event stream."
        />
        <StatCard
          label="Actors"
          value={distinctActors}
          detail="Named users or system processes that contributed to recent events."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent study audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--color-gray-900)]">
                      {event.action}
                    </p>
                    <Badge variant="muted">{event.entityType}</Badge>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                    {event.entityId}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[22rem]">
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Actor
                    </p>
                    <p className="mt-1 font-medium">{event.actorName ?? 'System process'}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                      {event.actorEmail ?? 'No direct user record'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Timestamp
                    </p>
                    <p className="mt-1 font-medium">{formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
