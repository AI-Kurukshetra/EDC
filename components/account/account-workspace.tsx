import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { AccountWorkspace } from '@/types'

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'muted',
} as const

const STUDY_STATUS_VARIANTS = {
  draft: 'muted',
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  terminated: 'danger',
} as const

type AccountWorkspaceProps = {
  workspace: AccountWorkspace
}

/** Shows the signed-in user's profile, notifications, site roles, and sponsored studies. */
export function AccountWorkspace({ workspace }: AccountWorkspaceProps) {
  const { profile, siteAssignments, sponsoredStudies } = workspace

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Role"
          value={profile.role.replaceAll('_', ' ')}
          detail="Current platform role attached to this authenticated session."
        />
        <StatCard
          label="Unread notifications"
          value={profile.unreadNotificationCount}
          detail="Unread tasks and alerts assigned to your account."
        />
        <StatCard
          label="Site assignments"
          value={siteAssignments.length}
          detail="Study-site memberships currently mapped to this user."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Signed-in account details for the current workspace session.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Full name
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">
              {profile.fullName}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Email
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">{profile.email}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Status
            </p>
            <div className="mt-2">
              <Badge variant={STATUS_VARIANTS[profile.isActive ? 'active' : 'inactive']}>
                {profile.isActive ? 'active' : 'inactive'}
              </Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Created
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">
              {formatDateTime(profile.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Site roles</CardTitle>
            <CardDescription>Operational site access mapped to this user account.</CardDescription>
          </CardHeader>
          <CardContent>
            {siteAssignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-6 text-sm text-[color:var(--color-gray-600)]">
                No site assignments are linked to this account yet.
              </div>
            ) : (
              <div className="space-y-4">
                {siteAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {assignment.siteName}
                      </p>
                      <Badge variant="muted">{assignment.siteCode}</Badge>
                      <Badge variant="default">{assignment.role.replaceAll('_', ' ')}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                      {assignment.studyTitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sponsored studies</CardTitle>
            <CardDescription>Studies where this account is the sponsor owner.</CardDescription>
          </CardHeader>
          <CardContent>
            {sponsoredStudies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-6 text-sm text-[color:var(--color-gray-600)]">
                This account does not currently own any studies.
              </div>
            ) : (
              <div className="space-y-4">
                {sponsoredStudies.map((study) => (
                  <div
                    key={study.id}
                    className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {study.title}
                      </p>
                      <Badge variant={STUDY_STATUS_VARIANTS[study.status]}>
                        {study.status.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                      {study.protocolNumber}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
