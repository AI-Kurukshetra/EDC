import type { ReactNode } from 'react'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getStudyDetail } from '@/lib/queries/studies'

const TAB_ITEMS = [
  { href: '', label: 'Overview' },
  { href: '/forms', label: 'Forms' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/data', label: 'Data' },
  { href: '/queries', label: 'Queries' },
  { href: '/sites', label: 'Sites' },
  { href: '/users', label: 'Users' },
  { href: '/documents', label: 'Documents' },
  { href: '/audit', label: 'Audit' },
  { href: '/export', label: 'Export' },
] as const

const STATUS_VARIANT = {
  draft: 'muted',
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  terminated: 'danger',
} as const

type StudyLayoutProps = {
  children: ReactNode
  params: Promise<{ studyId: string }>
}

/** Wraps all study detail routes with header metrics and section navigation. */
export default async function StudyLayout({ children, params }: StudyLayoutProps) {
  const { studyId } = await params
  const study = await getStudyDetail(studyId)

  if (!study) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(238,245,251,0.92))]">
        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                  {study.protocolNumber}
                </p>
                <Badge variant={STATUS_VARIANT[study.status]}>
                  {study.status.replace('_', ' ')}
                </Badge>
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--color-gray-900)]">
                {study.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--color-gray-600)]">
                {study.description ??
                  'No protocol description has been captured for this study yet.'}
              </p>
            </div>

            <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Phase
                </p>
                <p className="mt-1 font-medium">{study.phase}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Sites
                </p>
                <p className="mt-1 font-medium">{study.sites.length}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Open queries
                </p>
                <p className="mt-1 font-medium">{study.openQueries}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TAB_ITEMS.map((tab) => (
              <Button key={tab.href || 'overview'} asChild size="sm" variant="outline">
                <Link href={`/studies/${study.id}${tab.href}`}>{tab.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  )
}
