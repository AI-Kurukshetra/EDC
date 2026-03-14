'use client'

import { useMemo, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { MessageSquareReply } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateStudyQuery } from '@/lib/actions/study-queries'
import { formatDateTime } from '@/lib/utils/format'
import type { QueryStatus, StudyOperationsQueriesWorkspace, StudyOperationsQuery } from '@/types'

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
  workspace: StudyOperationsQueriesWorkspace
}

type QueryCardProps = {
  assigneeOptions: StudyOperationsQueriesWorkspace['assigneeOptions']
  query: StudyOperationsQuery
  studyId: string
}

function QueryCard({ assigneeOptions, query, studyId }: QueryCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [nextStatus, setNextStatus] = useState<QueryStatus>(query.status)
  const [assignedToId, setAssignedToId] = useState(query.assignedToId ?? '')
  const [responseText, setResponseText] = useState('')
  const [actionTaken, setActionTaken] = useState('')

  const hasChanges =
    nextStatus !== query.status ||
    assignedToId !== (query.assignedToId ?? '') ||
    responseText.trim().length > 0 ||
    actionTaken.trim().length > 0

  function handleSave() {
    startTransition(() => {
      void (async () => {
        const result = await updateStudyQuery({
          studyId,
          queryId: query.id,
          nextStatus,
          assignedToId: assignedToId || null,
          responseText,
          actionTaken,
        })

        if (!result.success) {
          toast.error(typeof result.error === 'string' ? result.error : 'Unable to update query.')
          return
        }

        setResponseText('')
        setActionTaken('')
        toast.success('Query updated.')
        router.refresh()
      })()
    })
  }

  return (
    <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={QUERY_STATUS_VARIANTS[query.status]}>{query.status}</Badge>
            <Badge variant={QUERY_PRIORITY_VARIANTS[query.priority]}>{query.priority}</Badge>
            <Badge variant="muted">{query.formName}</Badge>
            <Badge variant="muted">{query.fieldId}</Badge>
            <Badge variant={query.canManage ? 'success' : 'muted'}>
              {query.canManage ? 'actionable' : 'view only'}
            </Badge>
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
            <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">{query.siteName}</p>
          </div>
          <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Responses
            </p>
            <p className="mt-1 font-medium">{query.responseCount}</p>
            <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
              Last activity {formatDateTime(query.lastResponseAt)}
            </p>
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
            Last update
          </p>
          <p className="mt-1 font-medium">{formatDateTime(query.updatedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareReply className="h-4 w-4 text-[color:var(--color-navy-700)]" />
            <p className="font-medium text-[color:var(--color-gray-900)]">Response history</p>
          </div>

          {query.responses.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--color-gray-600)]">
              No responses recorded for this query yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {query.responses.map((response) => (
                <div
                  key={response.id}
                  className="rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-3"
                >
                  <p className="text-sm leading-6 text-[color:var(--color-gray-800)]">
                    {response.responseText}
                  </p>
                  {response.actionTaken ? (
                    <p className="mt-2 text-xs text-[color:var(--color-gray-600)]">
                      Action taken: {response.actionTaken}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[color:var(--color-gray-600)]">
                    {response.respondedByName ?? 'Unknown user'} •{' '}
                    {formatDateTime(response.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[#fefefe] px-4 py-4">
          <p className="font-medium text-[color:var(--color-gray-900)]">Query triage</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-gray-600)]">
            Record a response, update status, or reassign ownership without leaving the study queue.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Next status</span>
              <select
                className="flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                disabled={isPending || !query.canManage}
                value={nextStatus}
                onChange={(event) => {
                  setNextStatus(event.target.value as QueryStatus)
                }}
              >
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Assign to</span>
              <select
                className="flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                disabled={isPending || !query.canManage}
                value={assignedToId}
                onChange={(event) => {
                  setAssignedToId(event.target.value)
                }}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName} • {option.role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Response</span>
              <Textarea
                disabled={isPending || !query.canManage}
                placeholder="Record the site response, clarification, or monitoring follow-up."
                rows={4}
                value={responseText}
                onChange={(event) => {
                  setResponseText(event.target.value)
                }}
              />
            </label>

            <label className="block space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Action taken</span>
              <Input
                disabled={isPending || !query.canManage}
                placeholder="Optional summary of the corrective action or verification step"
                value={actionTaken}
                onChange={(event) => {
                  setActionTaken(event.target.value)
                }}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--color-gray-600)]">
              {query.canManage
                ? 'Status changes to answered, closed, or cancelled require response content.'
                : 'This query is visible here, but you do not currently have action rights.'}
            </p>
            <Button disabled={isPending || !query.canManage || !hasChanges} onClick={handleSave}>
              {isPending ? 'Saving...' : 'Save query update'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Renders the study-level query queue with inline response, assignment, and status controls. */
export function StudyQueriesWorkspace({ workspace }: StudyQueriesWorkspaceProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QueryStatus>('all')

  const filteredQueries = useMemo(() => {
    return workspace.queries.filter((query) => {
      const matchesStatus = statusFilter === 'all' || query.status === statusFilter
      const haystack = [
        query.subjectLabel,
        query.siteCode,
        query.siteName,
        query.formName,
        query.fieldId,
        query.queryText,
        query.raisedByName ?? '',
        query.assignedToName ?? '',
      ]
        .join(' ')
        .toLowerCase()
      const matchesSearch = search.trim().length === 0 || haystack.includes(search.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, workspace.queries])

  if (workspace.queries.length === 0) {
    return (
      <EmptyState
        title="No queries raised yet"
        description="Once monitors or automated checks raise discrepancies, this queue will show assignment, priority, and response activity."
      />
    )
  }

  const openQueries = workspace.queries.filter((query) => query.status === 'open').length
  const highPriorityQueries = workspace.queries.filter((query) => query.priority === 'high').length
  const respondedQueries = workspace.queries.filter((query) => query.responseCount > 0).length

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
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Search queue</span>
              <Input
                placeholder="Search subjects, forms, fields, or current ownership"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
              />
            </label>

            <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
              <span className="font-medium">Status filter</span>
              <select
                className="flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as 'all' | QueryStatus)
                }}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3 text-sm text-[color:var(--color-gray-700)]">
            Showing {filteredQueries.length} of {workspace.queries.length} queries. Signed-in user:{' '}
            {workspace.viewerName ?? 'Unknown user'}
            {workspace.viewerEmail ? ` (${workspace.viewerEmail})` : ''}.
          </div>

          {filteredQueries.length === 0 ? (
            <EmptyState
              title="No queries match the current filters"
              description="Adjust the queue search or status filter to see query response and triage controls."
            />
          ) : (
            filteredQueries.map((query) => (
              <QueryCard
                key={`${query.id}:${query.updatedAt}:${String(query.responseCount)}`}
                assigneeOptions={workspace.assigneeOptions}
                query={query}
                studyId={workspace.studyId}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
