import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsUser } from '@/types'

type StudyUsersWorkspaceProps = {
  users: StudyOperationsUser[]
}

/** Shows the study sponsor and site-user assignments that make up the Phase 1 access model. */
export function StudyUsersWorkspace({ users }: StudyUsersWorkspaceProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No study users assigned"
        description="As sponsor and site roles are mapped, this workspace will show assignment coverage and site-specific access."
      />
    )
  }

  const activeUsers = users.filter((user) => user.isActive).length
  const coreAssignments = users.filter((user) => user.siteId === null).length
  const siteAssignments = users.filter((user) => user.siteId !== null).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Assignments"
          value={users.length}
          detail="Sponsor and site-user role mappings for this study."
        />
        <StatCard
          label="Active users"
          value={activeUsers}
          detail="Assignments currently tied to active user profiles."
        />
        <StatCard
          label="Site roles"
          value={siteAssignments}
          detail="Assignments scoped to a specific site rather than the core study team."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Access roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--color-gray-900)]">
                      {user.fullName}
                    </p>
                    <Badge variant={user.isActive ? 'success' : 'muted'}>
                      {user.isActive ? 'active' : 'inactive'}
                    </Badge>
                    <Badge variant="default">{user.siteRole.replaceAll('_', ' ')}</Badge>
                    <Badge variant="muted">{user.profileRole.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">{user.email}</p>
                </div>

                <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[22rem]">
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Scope
                    </p>
                    <p className="mt-1 font-medium">{user.siteName ?? 'Core study team'}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                      {user.siteCode ?? 'Cross-study or sponsor ownership'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Assigned
                    </p>
                    <p className="mt-1 font-medium">{formatDateTime(user.assignedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Core assignments
            </p>
            <p className="mt-2 text-3xl font-semibold">{coreAssignments}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Unique emails
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {new Set(users.map((user) => user.email)).size}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Study sponsor
            </p>
            <p className="mt-2 text-lg font-semibold">
              {users.find((user) => user.siteRole === 'sponsor')?.fullName ?? 'Not assigned'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
