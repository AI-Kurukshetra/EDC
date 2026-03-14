'use client'

import type { ComponentPropsWithoutRef } from 'react'

import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils/cn'

export function Tabs({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-4', className)} {...props} />
}

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-2xl border border-[color:var(--color-gray-200)] bg-white p-1',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--color-gray-600)] transition-colors outline-none data-[state=active]:bg-[color:var(--color-navy-50)] data-[state=active]:text-[color:var(--color-navy-800)]',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />
}
