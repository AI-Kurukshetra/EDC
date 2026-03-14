import { Skeleton } from '@/components/ui/skeleton'

/** Loading skeleton for the study data-entry workspace. */
export default function StudyDataLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.35fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={String(index)} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={String(index)} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={String(index)} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={String(index)} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
