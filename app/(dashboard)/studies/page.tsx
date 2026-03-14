import { StudiesFilters } from '@/app/(dashboard)/studies/_components/studies-filters'
import { EmptyState } from '@/components/data-display/EmptyState'
import { StudiesTable } from '@/components/data-display/StudiesTable'
import { getStudies } from '@/lib/queries/studies'

type StudiesPageProps = {
  searchParams: Promise<{
    search?: string
    phase?: string
    status?: string
  }>
}

/** Displays the searchable study portfolio and active protocol inventory. */
export default async function StudiesPage({ searchParams }: StudiesPageProps) {
  const params = await searchParams
  const studies = await getStudies({
    search: params.search,
    phase:
      params.phase === 'Phase I' ||
      params.phase === 'Phase II' ||
      params.phase === 'Phase III' ||
      params.phase === 'Phase IV'
        ? params.phase
        : undefined,
    status:
      params.status === 'draft' ||
      params.status === 'active' ||
      params.status === 'on_hold' ||
      params.status === 'completed' ||
      params.status === 'terminated'
        ? params.status
        : undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
          Study management
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--color-gray-900)]">
          Manage active and planned trials
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-gray-600)]">
          Search and filter across protocol setup, site rollouts, enrollment readiness, and study
          status.
        </p>
      </div>

      <StudiesFilters />

      {studies.length === 0 ? (
        <EmptyState
          title="No studies found"
          description="Create your first study to start onboarding sites, forms, subjects, and monitoring workflows."
          actionHref="/studies/new"
          actionLabel="Create first study"
        />
      ) : (
        <StudiesTable studies={studies} />
      )}
    </div>
  )
}
