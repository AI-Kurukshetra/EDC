import type { HTMLAttributes } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--color-navy-100)] text-[color:var(--color-navy-800)]',
        success: 'bg-[color:var(--color-success-100)] text-[color:var(--color-success-700)]',
        warning: 'bg-[color:var(--color-warning-100)] text-[color:var(--color-warning-700)]',
        danger: 'bg-[color:var(--color-danger-100)] text-[color:var(--color-danger-700)]',
        muted: 'bg-[color:var(--color-gray-100)] text-[color:var(--color-gray-600)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
