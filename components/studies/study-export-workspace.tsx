'use client'

import { useState, useTransition } from 'react'

import Link from 'next/link'

import { ArrowUpRight, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requestStudyExport } from '@/lib/actions/study-exports'
import { formatDateTime } from '@/lib/utils/format'
import type { StudyOperationsExportWorkspace } from '@/types'

const EXPORT_STATUS_VARIANTS = {
  queued: 'muted',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
} as const

type ExportFormat = 'csv' | 'json' | 'cdisc'

type LatestDownload = {
  id: string
  url: string
  expiresAt: string
  format: ExportFormat
}

type StudyExportWorkspaceProps = {
  workspace: StudyOperationsExportWorkspace
}

/** Provides on-demand study exports plus a visible history of previously requested export jobs. */
export function StudyExportWorkspace({ workspace }: StudyExportWorkspaceProps) {
  const [isPending, startTransition] = useTransition()
  const [latestDownload, setLatestDownload] = useState<LatestDownload | null>(null)

  function handleRequestExport(format: ExportFormat) {
    startTransition(() => {
      void (async () => {
        const result = await requestStudyExport({
          studyId: workspace.studyId,
          format,
        })

        if (!result.success) {
          toast.error(typeof result.error === 'string' ? result.error : 'Export request failed.')
          return
        }

        setLatestDownload({
          id: result.data.id,
          url: result.data.signedUrl,
          expiresAt: result.data.expiresAt,
          format,
        })
        toast.success(`${format.toUpperCase()} export is ready to download.`)
      })()
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Subjects"
          value={workspace.subjectCount}
          detail="Participants that will be included in full-study exports."
        />
        <StatCard
          label="Entries"
          value={workspace.entryCount}
          detail="Captured CRF rows currently available for export packaging."
        />
        <StatCard
          label="Open queries"
          value={workspace.openQueryCount}
          detail="Outstanding discrepancies that may affect export readiness."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Generate study export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-gray-600)]">
            Create a signed download for the current study dataset. Phase 1 exports include the full
            study scope across {workspace.sites.length} sites and {workspace.formCount} published
            forms.
          </p>

          <div className="flex flex-wrap gap-3">
            {(['csv', 'json', 'cdisc'] as const).map((format) => (
              <Button
                key={format}
                disabled={isPending}
                type="button"
                onClick={() => {
                  handleRequestExport(format)
                }}
              >
                <Download className="h-4 w-4" />
                Export {format.toUpperCase()}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Included sites
              </p>
              <p className="mt-2 leading-6">
                {workspace.sites.length > 0
                  ? workspace.sites.map((site) => `${site.siteCode} • ${site.name}`).join(', ')
                  : 'No sites configured'}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Included forms
              </p>
              <p className="mt-2 leading-6">
                {workspace.forms.length > 0
                  ? workspace.forms.map((form) => form.label).join(', ')
                  : 'No published forms available'}
              </p>
            </div>
          </div>

          {latestDownload ? (
            <div className="rounded-2xl border border-[color:var(--color-success-100)] bg-[color:var(--color-success-50)] px-4 py-4 text-sm text-[color:var(--color-gray-800)]">
              <p className="font-medium">
                {latestDownload.format.toUpperCase()} export {latestDownload.id} is ready.
              </p>
              <p className="mt-1">
                Signed link expires {formatDateTime(latestDownload.expiresAt)}.
              </p>
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href={latestDownload.url} rel="noreferrer" target="_blank">
                  Download export
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export history</CardTitle>
        </CardHeader>
        <CardContent>
          {workspace.exports.length === 0 ? (
            <EmptyState
              title="No study exports requested"
              description="Requested exports will appear here with status, completion timestamps, and storage paths."
            />
          ) : (
            <div className="space-y-4">
              {workspace.exports.map((exportJob) => (
                <div
                  key={exportJob.id}
                  className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[color:var(--color-gray-900)]">
                          {exportJob.format.toUpperCase()} export
                        </p>
                        <Badge variant={EXPORT_STATUS_VARIANTS[exportJob.status]}>
                          {exportJob.status}
                        </Badge>
                      </div>
                      <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                        {exportJob.id}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[22rem]">
                      <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                        <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                          Requested by
                        </p>
                        <p className="mt-1 font-medium">
                          {exportJob.requestedByName ?? 'Unknown user'}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                          {exportJob.requestedByEmail ?? 'No email available'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                        <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                          Requested at
                        </p>
                        <p className="mt-1 font-medium">{formatDateTime(exportJob.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-3">
                    <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Completed at
                      </p>
                      <p className="mt-1 font-medium">{formatDateTime(exportJob.completedAt)}</p>
                    </div>
                    <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Signed URL expiry
                      </p>
                      <p className="mt-1 font-medium">
                        {formatDateTime(exportJob.signedUrlExpiresAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Storage path
                      </p>
                      <p className="mt-1 font-medium break-all">
                        {exportJob.filePath ?? 'Pending upload'}
                      </p>
                    </div>
                  </div>

                  {exportJob.errorMessage ? (
                    <div className="mt-4 rounded-xl border border-[color:var(--color-danger-100)] bg-[color:var(--color-danger-50)] px-4 py-3 text-sm text-[color:var(--color-danger-700)]">
                      {exportJob.errorMessage}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
