import type { ComponentPropsWithoutRef } from 'react'

import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils/cn'

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase',
        className,
      )}
      {...props}
    />
  )
}
