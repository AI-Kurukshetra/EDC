import { EmptyState } from '@/components/data-display/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudyDetail } from '@/lib/queries/studies'
import { formatPercentage } from '@/lib/utils/format'

type StudyOverviewPageProps = {
  params: Promise<{ studyId: string }>
}

/** Presents the overview metrics and site rollout summary for a study. */
export default async function StudyOverviewPage({ params }: StudyOverviewPageProps) {
  const { studyId } = await params
  const study = await getStudyDetail(studyId)

  if (!study) {
    return null
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>Study overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Enrolled subjects
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {study.enrolledSubjects}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Data completion
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {formatPercentage(study.completionRate)}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Participating sites
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {study.sites.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site rollout</CardTitle>
        </CardHeader>
        <CardContent>
          {study.sites.length === 0 ? (
            <EmptyState
              title="No sites configured"
              description="Add a site during study setup to enable subject enrollment and coordinator access."
            />
          ) : (
            <div className="space-y-3">
              {study.sites.map((site) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--color-gray-900)]">{site.name}</p>
                      <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                        {site.siteCode}
                      </p>
                    </div>
                    <p className="text-sm text-[color:var(--color-gray-600)]">{site.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
