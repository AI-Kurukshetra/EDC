'use client'

import { useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'react-hot-toast'

import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
} from '@/lib/actions/account-notifications'
import { formatDateTime } from '@/lib/utils/format'
import type { AccountWorkspace, QueryPriority } from '@/types'

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

const NOTIFICATION_PRIORITY_VARIANTS: Record<QueryPriority, 'muted' | 'warning' | 'danger'> = {
  low: 'muted',
  normal: 'warning',
  high: 'danger',
}

type AccountWorkspaceProps = {
  workspace: AccountWorkspace
}

/** Shows the signed-in user's profile, inbox, site roles, and sponsored studies. */
export function AccountWorkspace({ workspace }: AccountWorkspaceProps) {
  const router = useRouter()
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const [isPending, startPendingTransition] = useTransition()
  const { notifications, profile, siteAssignments, sponsoredStudies } = workspace
  const unreadNotifications = notifications.filter((notification) => notification.readAt === null)

  function handleMarkRead(notificationId: string) {
    setPendingTarget(notificationId)

    startPendingTransition(() => {
      void (async () => {
        const result = await markAccountNotificationRead({ notificationId })
        setPendingTarget(null)

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to update notification.',
          )
          return
        }

        toast.success('Notification marked as read.')
        router.refresh()
      })()
    })
  }

  function handleMarkAllRead() {
    setPendingTarget('all')

    startPendingTransition(() => {
      void (async () => {
        const result = await markAllAccountNotificationsRead()
        setPendingTarget(null)

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to update notifications.',
          )
          return
        }

        toast.success(
          result.data.count > 0
            ? `Marked ${String(result.data.count)} notifications as read.`
            : 'No unread notifications to update.',
        )
        router.refresh()
      })()
    })
  }

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

      <Card id="inbox">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              Platform tasks, admin announcements, and workflow alerts sent to this account.
            </CardDescription>
          </div>
          <Button
            disabled={isPending || unreadNotifications.length === 0}
            variant="outline"
            onClick={handleMarkAllRead}
          >
            {pendingTarget === 'all' ? 'Updating...' : 'Mark all read'}
          </Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-6 text-sm text-[color:var(--color-gray-600)]">
              No notifications have been delivered to this account yet.
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
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
                        <Badge variant="muted">{notification.type}</Badge>
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
                      {notification.entityId ? (
                        <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                          {notification.entityId}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-[12rem] lg:items-end">
                      <p className="text-sm text-[color:var(--color-gray-600)]">
                        {formatDateTime(notification.createdAt)}
                      </p>
                      {notification.readAt ? (
                        <p className="text-xs text-[color:var(--color-gray-500)]">
                          Read {formatDateTime(notification.readAt)}
                        </p>
                      ) : (
                        <Button
                          disabled={isPending}
                          variant="outline"
                          onClick={() => {
                            handleMarkRead(notification.id)
                          }}
                        >
                          {pendingTarget === notification.id ? 'Updating...' : 'Mark as read'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
