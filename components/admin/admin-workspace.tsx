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
import { Textarea } from '@/components/ui/textarea'
import { sendAdminNotification } from '@/lib/actions/admin-notifications'
import { provisionAdminUser } from '@/lib/actions/admin-provision-users'
import { updateAdminStudyGovernance } from '@/lib/actions/admin-studies'
import { updateAdminUserAccess } from '@/lib/actions/admin-users'
import { formatDateTime } from '@/lib/utils/format'
import {
  NOTIFICATION_TYPES,
  QUERY_PRIORITIES,
  STUDY_STATUSES,
  USER_ROLES,
  type AdminStudySummary,
  type AdminUserSummary,
  type AdminWorkspace,
  type NotificationType,
  type QueryPriority,
  type StudyStatus,
  type UserRole,
} from '@/types'

const ROLE_VARIANTS = {
  super_admin: 'danger',
  sponsor: 'default',
  investigator: 'success',
  coordinator: 'warning',
  monitor: 'default',
  data_manager: 'danger',
  read_only: 'muted',
} as const

const NOTIFICATION_PRIORITY_VARIANTS: Record<QueryPriority, 'muted' | 'warning' | 'danger'> = {
  low: 'muted',
  normal: 'warning',
  high: 'danger',
}

const STUDY_STATUS_VARIANTS: Record<
  StudyStatus,
  'muted' | 'success' | 'warning' | 'danger' | 'default'
> = {
  draft: 'muted',
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  terminated: 'danger',
}

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

type AdminStudyGovernanceControlsProps = {
  sponsorOptions: AdminUserSummary[]
  study: AdminStudySummary
}

type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]
type AdminNotificationScope = 'user' | 'role' | 'all_active'

function formatRoleLabel(role: UserRole) {
  return role.replaceAll('_', ' ')
}

function formatNotificationType(type: NotificationType) {
  return type.replaceAll('_', ' ')
}

function formatStudyStatus(status: StudyStatus) {
  return status.replaceAll('_', ' ')
}

function getAudienceCount(
  users: AdminUserSummary[],
  scope: AdminNotificationScope,
  userId: string,
  role: UserRole,
) {
  if (scope === 'all_active') {
    return users.filter((user) => user.isActive).length
  }

  if (scope === 'role') {
    return users.filter((user) => user.isActive && user.role === role).length
  }

  if (!userId) {
    return 0
  }

  return users.some((user) => user.isActive && user.id === userId) ? 1 : 0
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

function AdminStudyGovernanceControls({
  sponsorOptions,
  study,
}: AdminStudyGovernanceControlsProps) {
  const router = useRouter()
  const [sponsorId, setSponsorId] = useState(study.sponsorId)
  const [status, setStatus] = useState<StudyStatus>(study.status)
  const [isSaving, startSavingTransition] = useTransition()
  const hasChanges = sponsorId !== study.sponsorId || status !== study.status

  function handleSave() {
    if (!hasChanges) {
      return
    }

    startSavingTransition(() => {
      void (async () => {
        const result = await updateAdminStudyGovernance({
          studyId: study.id,
          sponsorId,
          status,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to update study governance.',
          )
          return
        }

        toast.success('Study governance updated.')
        router.refresh()
      })()
    })
  }

  return (
    <div className="mt-4 rounded-2xl border border-[color:var(--color-navy-100)] bg-[color:var(--color-navy-50)] px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1fr_0.7fr_auto]">
        <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
          <span className="font-medium">Sponsor owner</span>
          <select
            className={SELECT_CLASS_NAME}
            disabled={isSaving}
            value={sponsorId}
            onChange={(event) => {
              setSponsorId(event.target.value)
            }}
          >
            {sponsorOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
          <span className="font-medium">Study status</span>
          <select
            className={SELECT_CLASS_NAME}
            disabled={isSaving}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StudyStatus)
            }}
          >
            {STUDY_STATUSES.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {formatStudyStatus(statusOption)}
              </option>
            ))}
          </select>
        </label>

        <Button disabled={isSaving || !hasChanges} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save governance'}
        </Button>
      </div>
    </div>
  )
}

/** Renders the Phase 2 platform administration workspace for super admins. */
export function AdminWorkspaceView({ workspace }: AdminWorkspaceProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all')
  const [provisionFullName, setProvisionFullName] = useState('')
  const [provisionEmail, setProvisionEmail] = useState('')
  const [provisionRole, setProvisionRole] = useState<UserRole>('coordinator')
  const [provisionTemporaryPassword, setProvisionTemporaryPassword] = useState('Password123!')
  const [provisionSiteId, setProvisionSiteId] = useState('')
  const [provisionSiteRole, setProvisionSiteRole] = useState<UserRole>('coordinator')
  const [notificationScope, setNotificationScope] = useState<AdminNotificationScope>('user')
  const [notificationUserId, setNotificationUserId] = useState('')
  const [notificationRole, setNotificationRole] = useState<UserRole>('sponsor')
  const [notificationType, setNotificationType] = useState<NotificationType>('announcement')
  const [notificationPriority, setNotificationPriority] = useState<QueryPriority>('normal')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationEntityId, setNotificationEntityId] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [isProvisioning, startProvisionTransition] = useTransition()
  const [isDispatching, startDispatchTransition] = useTransition()
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
  const activeUserCount = workspace.users.filter((user) => user.isActive).length
  const sponsorOptions = workspace.users.filter(
    (user) => user.isActive && (user.role === 'sponsor' || user.role === 'super_admin'),
  )
  const notificationAudienceCount = getAudienceCount(
    workspace.users,
    notificationScope,
    notificationUserId,
    notificationRole,
  )
  const selectedProvisionSite =
    provisionSiteId.length > 0
      ? workspace.sites.find((site) => site.id === provisionSiteId) ?? null
      : null

  function resetProvisionComposer() {
    setProvisionFullName('')
    setProvisionEmail('')
    setProvisionRole('coordinator')
    setProvisionTemporaryPassword('Password123!')
    setProvisionSiteId('')
    setProvisionSiteRole('coordinator')
  }

  function handleProvisionUser() {
    startProvisionTransition(() => {
      void (async () => {
        const result = await provisionAdminUser({
          fullName: provisionFullName,
          email: provisionEmail,
          role: provisionRole,
          temporaryPassword: provisionTemporaryPassword,
          siteId: provisionSiteId || undefined,
          siteRole: provisionSiteId ? provisionSiteRole : undefined,
        })

        if (!result.success) {
          toast.error(typeof result.error === 'string' ? result.error : 'Unable to provision user.')
          return
        }

        toast.success(
          selectedProvisionSite
            ? `Provisioned ${result.data.email} and assigned ${selectedProvisionSite.siteCode}.`
            : `Provisioned ${result.data.email}.`,
        )
        resetProvisionComposer()
        router.refresh()
      })()
    })
  }

  function resetNotificationComposer() {
    setNotificationScope('user')
    setNotificationUserId('')
    setNotificationRole('sponsor')
    setNotificationType('announcement')
    setNotificationPriority('normal')
    setNotificationTitle('')
    setNotificationEntityId('')
    setNotificationMessage('')
  }

  function handleSendNotification() {
    startDispatchTransition(() => {
      void (async () => {
        const result = await sendAdminNotification({
          scope: notificationScope,
          userId:
            notificationScope === 'user' && notificationUserId ? notificationUserId : undefined,
          role: notificationScope === 'role' ? notificationRole : undefined,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          entityId: notificationEntityId,
          priority: notificationPriority,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to send notification.',
          )
          return
        }

        if (result.data.deliveredCount === result.data.recipientCount) {
          toast.success(
            `Notification delivered to ${String(result.data.deliveredCount)} recipients.`,
          )
        } else {
          toast.success(
            `Delivered to ${String(result.data.deliveredCount)} of ${String(result.data.recipientCount)} recipients.`,
          )
        }

        resetNotificationComposer()
        router.refresh()
      })()
    })
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Provision user</CardTitle>
            <CardDescription>
              Create a new platform account with a temporary password and optionally attach the user to an existing site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Full name</span>
                <Input
                  disabled={isProvisioning}
                  placeholder="Aisha Patel"
                  value={provisionFullName}
                  onChange={(event) => {
                    setProvisionFullName(event.target.value)
                  }}
                />
              </label>

              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Email</span>
                <Input
                  disabled={isProvisioning}
                  placeholder="aisha@clinicalhub.dev"
                  type="email"
                  value={provisionEmail}
                  onChange={(event) => {
                    setProvisionEmail(event.target.value)
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Platform role</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isProvisioning}
                  value={provisionRole}
                  onChange={(event) => {
                    setProvisionRole(event.target.value as UserRole)
                  }}
                >
                  {USER_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {formatRoleLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Temporary password</span>
                <Input
                  disabled={isProvisioning}
                  placeholder="Password123!"
                  value={provisionTemporaryPassword}
                  onChange={(event) => {
                    setProvisionTemporaryPassword(event.target.value)
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Optional site assignment</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isProvisioning}
                  value={provisionSiteId}
                  onChange={(event) => {
                    setProvisionSiteId(event.target.value)
                  }}
                >
                  <option value="">No site assignment</option>
                  {workspace.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteCode} - {site.name} - {site.studyTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Site role</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isProvisioning || provisionSiteId.length === 0}
                  value={provisionSiteRole}
                  onChange={(event) => {
                    setProvisionSiteRole(event.target.value as UserRole)
                  }}
                >
                  {USER_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {formatRoleLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
              <p className="font-medium text-[color:var(--color-gray-900)]">
                New accounts are created active and email-confirmed.
              </p>
              <p className="mt-2">
                Share the temporary password directly with the user and ask them to rotate it after first sign-in.
              </p>
              {selectedProvisionSite ? (
                <p className="mt-2 text-[color:var(--color-gray-600)]">
                  Selected site: {selectedProvisionSite.siteCode} in {selectedProvisionSite.studyTitle}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                disabled={isProvisioning}
                variant="outline"
                onClick={resetProvisionComposer}
              >
                Reset
              </Button>
              <Button
                disabled={
                  isProvisioning ||
                  provisionFullName.trim().length < 3 ||
                  provisionEmail.trim().length < 3 ||
                  provisionTemporaryPassword.length < 8
                }
                onClick={handleProvisionUser}
              >
                {isProvisioning ? 'Provisioning...' : 'Provision account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispatch notification</CardTitle>
            <CardDescription>
              Send a platform announcement, task, or alert to one user, one role audience, or every
              active account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Audience</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isDispatching}
                  value={notificationScope}
                  onChange={(event) => {
                    setNotificationScope(event.target.value as AdminNotificationScope)
                  }}
                >
                  <option value="user">Single user</option>
                  <option value="role">Role audience</option>
                  <option value="all_active">All active users</option>
                </select>
              </label>

              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Priority</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isDispatching}
                  value={notificationPriority}
                  onChange={(event) => {
                    setNotificationPriority(event.target.value as QueryPriority)
                  }}
                >
                  {QUERY_PRIORITIES.map((priorityOption) => (
                    <option key={priorityOption} value={priorityOption}>
                      {priorityOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {notificationScope === 'user' ? (
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Recipient</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isDispatching}
                  value={notificationUserId}
                  onChange={(event) => {
                    setNotificationUserId(event.target.value)
                  }}
                >
                  <option value="">Select a recipient</option>
                  {workspace.users
                    .filter((user) => user.isActive)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                </select>
              </label>
            ) : null}

            {notificationScope === 'role' ? (
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Role audience</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isDispatching}
                  value={notificationRole}
                  onChange={(event) => {
                    setNotificationRole(event.target.value as UserRole)
                  }}
                >
                  {USER_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {formatRoleLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Notification type</span>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={isDispatching}
                  value={notificationType}
                  onChange={(event) => {
                    setNotificationType(event.target.value as NotificationType)
                  }}
                >
                  {NOTIFICATION_TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {formatNotificationType(typeOption)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Entity reference</span>
                <Input
                  disabled={isDispatching}
                  placeholder="Optional record or study id"
                  value={notificationEntityId}
                  onChange={(event) => {
                    setNotificationEntityId(event.target.value)
                  }}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Title</span>
              <Input
                disabled={isDispatching}
                placeholder="System maintenance window"
                value={notificationTitle}
                onChange={(event) => {
                  setNotificationTitle(event.target.value)
                }}
              />
            </label>

            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Message</span>
              <Textarea
                disabled={isDispatching}
                placeholder="Explain the task, alert, or announcement the recipient needs to see."
                value={notificationMessage}
                onChange={(event) => {
                  setNotificationMessage(event.target.value)
                }}
              />
            </label>

            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
              <p className="font-medium text-[color:var(--color-gray-900)]">
                Audience estimate: {String(notificationAudienceCount)} recipients
              </p>
              <p className="mt-2">
                Active platform users available right now: {String(activeUserCount)}.
              </p>
              <p className="mt-1 text-[color:var(--color-gray-600)]">
                High-priority notifications will also attempt email delivery when the edge function
                email configuration is present.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                disabled={isDispatching}
                variant="outline"
                onClick={resetNotificationComposer}
              >
                Reset
              </Button>
              <Button
                disabled={
                  isDispatching ||
                  notificationAudienceCount === 0 ||
                  notificationTitle.trim().length < 3 ||
                  notificationMessage.trim().length < 5
                }
                onClick={handleSendNotification}
              >
                {isDispatching ? 'Sending...' : 'Send notification'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
          <CardDescription>
            Latest inbox items delivered across the platform, including read state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.recentNotifications.length > 0 ? (
            workspace.recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {notification.title}
                      </p>
                      <Badge variant="muted">{formatNotificationType(notification.type)}</Badge>
                      <Badge variant={NOTIFICATION_PRIORITY_VARIANTS[notification.priority]}>
                        {notification.priority}
                      </Badge>
                      <Badge variant={notification.readAt ? 'muted' : 'success'}>
                        {notification.readAt ? 'read' : 'unread'}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-[color:var(--color-gray-700)]">
                      {notification.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-gray-600)]">
                      <span>{notification.recipientName}</span>
                      <span>{notification.recipientEmail}</span>
                    </div>
                    {notification.entityId ? (
                      <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                        {notification.entityId}
                      </p>
                    ) : null}
                  </div>

                  <div className="lg:text-right">
                    <p className="text-sm text-[color:var(--color-gray-600)]">
                      {formatDateTime(notification.createdAt)}
                    </p>
                    {notification.readAt ? (
                      <p className="mt-2 text-xs text-[color:var(--color-gray-500)]">
                        Read {formatDateTime(notification.readAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No notifications sent yet"
              description="Dispatched announcements and alerts will appear here once delivery begins."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study governance</CardTitle>
          <CardDescription>
            Reassign sponsor ownership and update live study status without leaving the platform
            ops workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.studies.length > 0 ? (
            workspace.studies.map((study) => (
              <div
                key={study.id}
                className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[color:var(--color-gray-900)]">{study.title}</p>
                      <Badge variant={STUDY_STATUS_VARIANTS[study.status]}>
                        {formatStudyStatus(study.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                      {study.protocolNumber}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                      Current sponsor: {study.sponsorName ?? 'Unknown'}{' '}
                      {study.sponsorEmail ? `(${study.sponsorEmail})` : ''}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[18rem]">
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Sites
                      </p>
                      <p className="mt-1 font-medium">{study.siteCount}</p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Subjects
                      </p>
                      <p className="mt-1 font-medium">{study.subjectCount}</p>
                    </div>
                  </div>
                </div>

                <AdminStudyGovernanceControls sponsorOptions={sponsorOptions} study={study} />
              </div>
            ))
          ) : (
            <EmptyState
              title="No studies available"
              description="Studies will appear here as soon as they are created in the platform."
            />
          )}
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
