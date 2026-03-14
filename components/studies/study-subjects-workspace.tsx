'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsSubjectsWorkspace } from '@/types'

const SUBJECT_STATUS_VARIANTS = {
  screened: 'muted',
  enrolled: 'success',
  randomized: 'default',
  completed: 'success',
  withdrawn: 'warning',
  screen_failed: 'danger',
} as const

type StudySubjectsWorkspaceProps = {
  workspace: StudyOperationsSubjectsWorkspace
}

/** Renders the study-subject roster with operational data-capture indicators. */
export function StudySubjectsWorkspace({ workspace }: StudySubjectsWorkspaceProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subject roster</CardTitle>
          <CardDescription>
            Viewing as {workspace.viewerName ?? workspace.viewerEmail ?? 'unknown user'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {workspace.subjects.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-[color:var(--color-gray-600)]">
              No subjects are available for this study yet.
            </div>
          ) : (
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--color-gray-100)] text-left">
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Site
                  </th>
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Open queries
                  </th>
                  <th className="px-6 py-3 text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                    Last submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {workspace.subjects.map((subject, index) => (
                  <tr
                    key={subject.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[color:var(--color-gray-50)]'}
                  >
                    <td className="px-6 py-4 align-top">
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {subject.subjectId}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                        Enrolled {formatDate(subject.enrollmentDate)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                      {subject.siteName} ({subject.siteCode})
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={SUBJECT_STATUS_VARIANTS[subject.status]}>
                        {subject.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                      {subject.submittedEntryCount}/{subject.entryCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                      {subject.openQueryCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                      {formatDateTime(subject.lastSubmittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
