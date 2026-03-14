import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[linear-gradient(90deg,var(--color-gray-100),var(--color-navy-50),var(--color-gray-100))]',
        className,
      )}
      {...props}
    />
  )
}
