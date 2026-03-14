import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

type StatCardProps = {
  label: string
  value: string | number
  detail: string
  trend?: 'up' | 'down'
  className?: string
}

/** Displays a compact KPI card for dashboard-level operational metrics. */
export function StatCard({ label, value, detail, trend, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        'border-transparent bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,245,251,0.95))]',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              {label}
            </p>
            <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
          </div>
          {trend ? (
            <div
              className={cn(
                'rounded-full p-2',
                trend === 'up'
                  ? 'bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]'
                  : 'bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]',
              )}
            >
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[color:var(--color-gray-600)]">{detail}</p>
      </CardContent>
    </Card>
  )
}
