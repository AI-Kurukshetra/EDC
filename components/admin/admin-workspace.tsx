import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { AdminWorkspace } from '@/types'

const ROLE_VARIANTS = {
  super_admin: 'danger',
  sponsor: 'default',
  investigator: 'success',
  coordinator: 'warning',
  monitor: 'default',
  data_manager: 'danger',
  read_only: 'muted',
} as const

type AdminWorkspaceProps = {
  workspace: AdminWorkspace
}

/** Renders the first platform-ops administration view for super admins. */
export function AdminWorkspaceView({ workspace }: AdminWorkspaceProps) {
  if (!workspace.isAuthorized) {
    return (
      <EmptyState
        title="Admin access required"
        description="This Phase 2 workspace is currently reserved for super-admin accounts."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total users"
          value={workspace.totalUsers}
          detail="All provisioned profiles across the platform."
        />
        <StatCard
          label="Active users"
          value={workspace.activeUsers}
          detail="Profiles currently marked active in platform access control."
        />
        <StatCard
          label="Studies"
          value={workspace.totalStudies}
          detail="Platform-wide studies currently stored in the system."
        />
        <StatCard
          label="Site assignments"
          value={workspace.totalSiteAssignments}
          detail="Mapped site-user relationships across all studies."
        />
        <StatCard
          label="Unread notifications"
          value={workspace.totalUnreadNotifications}
          detail="Unread platform tasks and alerts across all users."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Role distribution</CardTitle>
            <CardDescription>Current role mix across provisioned user profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.roleDistribution.map((entry) => (
              <div
                key={entry.role}
                className="flex items-center justify-between rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3"
              >
                <Badge variant={ROLE_VARIANTS[entry.role]}>{entry.role.replaceAll('_', ' ')}</Badge>
                <span className="text-sm font-medium text-[color:var(--color-gray-900)]">
                  {entry.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform users</CardTitle>
            <CardDescription>
              Profile inventory with study ownership, site access, and notification load.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.users.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {user.fullName}
                      </p>
                      <Badge variant={ROLE_VARIANTS[user.role]}>
                        {user.role.replaceAll('_', ' ')}
                      </Badge>
                      <Badge variant={user.isActive ? 'success' : 'muted'}>
                        {user.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">{user.email}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[22rem]">
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Sponsored studies
                      </p>
                      <p className="mt-1 font-medium">{user.sponsoredStudyCount}</p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Unread notifications
                      </p>
                      <p className="mt-1 font-medium">{user.unreadNotificationCount}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-[0.65fr_0.35fr]">
                  <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Assigned sites
                    </p>
                    <p className="mt-1 font-medium">
                      {user.assignedSites.length > 0
                        ? user.assignedSites.join(', ')
                        : 'No site assignments'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Created
                    </p>
                    <p className="mt-1 font-medium">{formatDateTime(user.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
