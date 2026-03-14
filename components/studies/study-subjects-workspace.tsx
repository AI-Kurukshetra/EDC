import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsSubject } from '@/types'

const SUBJECT_STATUS_VARIANTS = {
  screened: 'muted',
  enrolled: 'success',
  randomized: 'default',
  completed: 'success',
  withdrawn: 'warning',
  screen_failed: 'danger',
} as const

type StudySubjectsWorkspaceProps = {
  subjects: StudyOperationsSubject[]
}

/** Summarizes subject enrollment status and site-level data capture progress for one study. */
export function StudySubjectsWorkspace({ subjects }: StudySubjectsWorkspaceProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects enrolled yet"
        description="Once a site enrolls participants, this roster will show subject status, visit activity, and open query load."
      />
    )
  }

  const openQueries = subjects.reduce((count, subject) => count + subject.openQueryCount, 0)
  const submittedEntries = subjects.reduce(
    (count, subject) => count + subject.submittedEntryCount,
    0,
  )
  const activeSubjects = subjects.filter((subject) =>
    ['enrolled', 'randomized', 'completed'].includes(subject.status),
  ).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Subjects"
          value={subjects.length}
          detail="All screened, enrolled, randomized, completed, and withdrawn participants."
        />
        <StatCard
          label="Active subjects"
          value={activeSubjects}
          detail="Participants currently enrolled, randomized, or completed."
        />
        <StatCard
          label="Open queries"
          value={openQueries}
          detail="Unresolved data discrepancies tied to this subject roster."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Subject roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--color-gray-900)]">
                      {subject.subjectId}
                    </p>
                    <Badge variant={SUBJECT_STATUS_VARIANTS[subject.status]}>
                      {subject.status.replaceAll('_', ' ')}
                    </Badge>
                    <Badge variant="muted">{subject.siteCode}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                    {subject.siteName}
                    {subject.siteCountry ? ` • ${subject.siteCountry}` : ''}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[20rem]">
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Entries
                    </p>
                    <p className="mt-1 font-medium">
                      {subject.submittedEntryCount} submitted / {subject.entryCount} total
                    </p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Queries
                    </p>
                    <p className="mt-1 font-medium">{subject.openQueryCount} open</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Consent date
                  </p>
                  <p className="mt-1 font-medium">{formatDate(subject.consentDate)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Enrollment date
                  </p>
                  <p className="mt-1 font-medium">{formatDate(subject.enrollmentDate)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Last visit
                  </p>
                  <p className="mt-1 font-medium">{formatDate(subject.lastVisitDate)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                  <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Last submission
                  </p>
                  <p className="mt-1 font-medium">{formatDateTime(subject.lastSubmittedAt)}</p>
                </div>
              </div>

              {subject.withdrawalDate || subject.withdrawalReason ? (
                <div className="mt-4 rounded-xl border border-[color:var(--color-warning-100)] bg-[color:var(--color-warning-50)] px-4 py-3 text-sm text-[color:var(--color-gray-700)]">
                  Withdrawal recorded on {formatDate(subject.withdrawalDate)}
                  {subject.withdrawalReason ? ` • ${subject.withdrawalReason}` : ''}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data capture pulse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Submitted entries
            </p>
            <p className="mt-2 text-3xl font-semibold">{submittedEntries}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Average entries
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {Math.round(
                (subjects.reduce((count, subject) => count + subject.entryCount, 0) /
                  subjects.length) *
                  10,
              ) / 10}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Query burden
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {Math.round((openQueries / subjects.length) * 10) / 10}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
