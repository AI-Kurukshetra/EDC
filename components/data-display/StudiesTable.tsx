import Link from 'next/link'

import { ArrowUpRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { StudySummary } from '@/types'

const STATUS_VARIANT = {
  draft: 'muted',
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  terminated: 'danger',
} as const

type StudiesTableProps = {
  studies: StudySummary[]
  className?: string
}

/** Lists studies in a tabular operational view with quick navigation actions. */
export function StudiesTable({ studies, className }: StudiesTableProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-col gap-1 border-b border-[color:var(--color-gray-100)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
            Portfolio
          </p>
          <CardTitle className="mt-1">Clinical studies</CardTitle>
        </div>
        <Button asChild size="sm">
          <Link href="/studies/new">Create study</Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-0">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--color-gray-100)] text-left">
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Study
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Phase
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Start
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Target
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {studies.map((study, index) => (
              <tr
                key={study.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-[color:var(--color-gray-50)]'}
              >
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[color:var(--color-gray-900)]">
                      {study.title}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                      {study.protocolNumber}
                    </span>
                    {study.therapeuticArea ? (
                      <span className="text-sm text-[color:var(--color-gray-600)]">
                        {study.therapeuticArea}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                  {study.phase}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={STATUS_VARIANT[study.status]}>
                    {study.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                  {formatDate(study.startDate)}
                </td>
                <td className="px-6 py-4 text-sm text-[color:var(--color-gray-700)]">
                  {study.targetEnrollment ?? '—'}
                </td>
                <td className="px-6 py-4">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/studies/${study.id}`}>
                      Open
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
