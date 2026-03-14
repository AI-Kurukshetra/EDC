import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudies } from '@/lib/queries/studies'

type QueriesHubPageProps = Record<string, never>

/** Lets operators pick a study before entering the study-scoped query workspace. */
export default async function QueriesHubPage(_props: QueriesHubPageProps) {
  const studies = await getStudies()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
          Query review
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--color-gray-900)]">
          Select a study to review queries
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-gray-600)]">
          Query workspaces are study-specific. Choose a study below to open its query queue.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Studies</CardTitle>
          <CardDescription>Open a study query workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {studies.length === 0 ? (
            <p className="text-sm text-[color:var(--color-gray-600)]">No studies available yet.</p>
          ) : (
            studies.map((study) => (
              <Link
                key={study.id}
                className="flex items-center justify-between rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--color-gray-800)] transition-colors hover:border-[color:var(--color-navy-700)] hover:text-[color:var(--color-navy-800)]"
                href={`/studies/${study.id}/queries`}
              >
                <span>{study.title}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                  {study.protocolNumber}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
