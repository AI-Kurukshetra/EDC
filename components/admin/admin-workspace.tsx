'use client'

import { useDeferredValue, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updateAdminUserAccess } from '@/lib/actions/admin-users'
import { formatDateTime } from '@/lib/utils/format'
import { USER_ROLES, type AdminUserSummary, type AdminWorkspace, type UserRole } from '@/types'

const ROLE_VARIANTS = {
  super_admin: 'danger',
  sponsor: 'default',
  investigator: 'success',
  coordinator: 'warning',
  monitor: 'default',
  data_manager: 'danger',
  read_only: 'muted',
} as const

const USER_STATUS_FILTERS = ['all', 'active', 'inactive'] as const
const SELECT_CLASS_NAME =
  'flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]'

type AdminWorkspaceProps = {
  workspace: AdminWorkspace
}

type AdminUserAccessControlsProps = {
  user: AdminUserSummary
  isViewer: boolean
}

type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]

function formatRoleLabel(role: UserRole) {
  return role.replaceAll('_', ' ')
}

function AdminUserAccessControls({ user, isViewer }: AdminUserAccessControlsProps) {
  const router = useRouter()
  const [role, setRole] = useState<AdminUserSummary['role']>(user.role)
  const [isActive, setIsActive] = useState<boolean>(user.isActive)
  const [isSaving, startSavingTransition] = useTransition()
  const hasChanges = role !== user.role || isActive !== user.isActive

  function handleSave() {
    if (!hasChanges || isViewer) {
      return
    }

    startSavingTransition(() => {
      void (async () => {
        const result = await updateAdminUserAccess({
          userId: user.id,
          role,
          isActive,
        })

        if (!result.success) {
          toast.error(typeof result.error === 'string' ? result.error : 'Unable to update access.')
          return
        }

        toast.success('User access updated.')
        router.refresh()
      })()
    })
  }

  return (
    <div className="mt-4 rounded-2xl border border-[color:var(--color-navy-100)] bg-[color:var(--color-navy-50)] px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[0.9fr_0.45fr_0.35fr]">
        <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
          <span className="font-medium">Platform role</span>
          <select
            className={SELECT_CLASS_NAME}
            disabled={isSaving || isViewer}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as AdminUserSummary['role'])
            }}
          >
            {USER_ROLES.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {formatRoleLabel(roleOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-3 text-sm text-[color:var(--color-gray-700)]">
          <input
            checked={isActive}
            disabled={isSaving || isViewer}
            type="checkbox"
            onChange={(event) => {
              setIsActive(event.target.checked)
            }}
          />
          <span>{isActive ? 'Account active' : 'Account inactive'}</span>
        </label>

        <Button disabled={isSaving || isViewer || !hasChanges} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save access'}
        </Button>
      </div>

      {isViewer ? (
        <p className="mt-3 text-xs text-[color:var(--color-gray-600)]">
          Your own super-admin access is protected from self-demotion or self-deactivation.
        </p>
      ) : null}
    </div>
  )
}

/** Renders the first platform-ops administration view for super admins. */
export function AdminWorkspaceView({ workspace }: AdminWorkspaceProps) {
  const [searchValue, setSearchValue] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all')
  const deferredSearchValue = useDeferredValue(searchValue)

  if (!workspace.isAuthorized) {
    return (
      <EmptyState
        title="Admin access required"
        description="This Phase 2 workspace is currently reserved for super-admin accounts."
      />
    )
  }

  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase()
  const filteredUsers = workspace.users.filter((user) => {
    const matchesSearch =
      normalizedSearchValue.length === 0 ||
      [user.fullName, user.email, formatRoleLabel(user.role), user.assignedSites.join(' ')].some(
        (value) => value.toLowerCase().includes(normalizedSearchValue),
      )
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })
  const activeFilterCount =
    Number(searchValue.trim().length > 0) +
    Number(roleFilter !== 'all') +
    Number(statusFilter !== 'all')

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

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
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
                <Badge variant={ROLE_VARIANTS[entry.role]}>{formatRoleLabel(entry.role)}</Badge>
                <span className="text-sm font-medium text-[color:var(--color-gray-900)]">
                  {entry.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent audit activity</CardTitle>
            <CardDescription>
              Latest governance events captured across platform operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.recentAuditEvents.length > 0 ? (
              workspace.recentAuditEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[color:var(--color-gray-900)]">
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
              ))
            ) : (
              <EmptyState
                title="No admin audit activity yet"
                description="New governance actions will appear here once they are recorded."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform users</CardTitle>
          <CardDescription>
            Profile inventory with study ownership, site access, and notification load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4 lg:grid-cols-[1fr_14rem_12rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--color-gray-400)]" />
              <Input
                className="h-10 pl-10"
                placeholder="Search users, emails, roles, or sites"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value)
                }}
              />
            </div>

            <select
              className={SELECT_CLASS_NAME}
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as 'all' | UserRole)
              }}
            >
              <option value="all">All roles</option>
              {USER_ROLES.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {formatRoleLabel(roleOption)}
                </option>
              ))}
            </select>

            <select
              className={SELECT_CLASS_NAME}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as UserStatusFilter)
              }}
            >
              {USER_STATUS_FILTERS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption === 'all' ? 'All statuses' : `${statusOption} users`}
                </option>
              ))}
            </select>

            <Button
              disabled={activeFilterCount === 0}
              variant="outline"
              onClick={() => {
                setSearchValue('')
                setRoleFilter('all')
                setStatusFilter('all')
              }}
            >
              Reset filters
            </Button>
          </div>

          <div className="flex flex-col gap-2 text-sm text-[color:var(--color-gray-600)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {filteredUsers.length} of {workspace.users.length} users.
            </p>
            <p>
              {activeFilterCount > 0
                ? `${String(activeFilterCount)} filters active`
                : 'No filters applied'}
            </p>
          </div>

          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
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
                      <Badge variant={ROLE_VARIANTS[user.role]}>{formatRoleLabel(user.role)}</Badge>
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

                <AdminUserAccessControls isViewer={workspace.viewer.id === user.id} user={user} />
              </div>
            ))
          ) : (
            <EmptyState
              title="No users match the current filters"
              description="Adjust the search term, role, or status filter to widen the platform user view."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
