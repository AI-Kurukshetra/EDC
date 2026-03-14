import type { ComponentPropsWithoutRef } from 'react'

import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '@/lib/utils/cn'

export function Avatar({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

export function AvatarImage({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image className={cn('aspect-square h-full w-full', className)} {...props} />
  )
}

export function AvatarFallback({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-[color:var(--color-navy-100)] text-sm font-semibold text-[color:var(--color-navy-800)]',
        className,
      )}
      {...props}
    />
  )
}
