import Link from 'next/link'

import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  className?: string
}

/** Renders a reusable empty-state card with an optional call to action. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        'border-dashed bg-[linear-gradient(135deg,rgba(238,245,251,0.9),rgba(255,255,255,0.96))]',
        className,
      )}
    >
      <CardHeader className="items-center text-center">
        <div className="mb-2 h-16 w-16 rounded-2xl bg-[color:var(--color-navy-100)]" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <p className="max-w-prose text-sm text-[color:var(--color-gray-600)]">{description}</p>
        {actionHref && actionLabel ? (
          <Button asChild>
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
