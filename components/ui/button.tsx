import type { ButtonHTMLAttributes } from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-navy-700)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--color-navy-800)] text-white shadow-sm hover:bg-[color:var(--color-navy-700)]',
        outline:
          'border border-[color:var(--color-gray-200)] bg-white text-[color:var(--color-gray-900)] hover:border-[color:var(--color-navy-700)] hover:bg-[color:var(--color-navy-50)]',
        ghost:
          'bg-transparent text-[color:var(--color-gray-700)] hover:bg-[color:var(--color-gray-100)]',
        destructive:
          'bg-[color:var(--color-danger-700)] text-white hover:bg-[color:var(--color-danger-500)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...(!asChild ? { type: type ?? 'button' } : {})}
      {...props}
    />
  )
}

export { buttonVariants }
