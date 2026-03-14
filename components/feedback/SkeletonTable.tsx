import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

const SKELETON_ROW_KEYS = [
  'skeleton-row-1',
  'skeleton-row-2',
  'skeleton-row-3',
  'skeleton-row-4',
  'skeleton-row-5',
] as const

type SkeletonTableProps = {
  className?: string
}

/** Renders a table-shaped loading placeholder for study list views. */
export function SkeletonTable({ className }: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-6',
        className,
      )}
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        {SKELETON_ROW_KEYS.map((rowKey) => (
          <div
            key={rowKey}
            className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 rounded-2xl border border-[color:var(--color-gray-100)] p-4"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
