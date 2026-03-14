import { forwardRef, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-28 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none placeholder:text-[color:var(--color-gray-400)] focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-gray-100)]',
        className,
      )}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'
