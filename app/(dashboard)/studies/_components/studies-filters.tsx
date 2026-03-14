'use client'

import { Search } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

type StudiesFiltersProps = {
  className?: string
}

/** Controls study list filtering through synchronized URL query parameters. */
export function StudiesFilters({ className }: StudiesFiltersProps) {
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    phase: parseAsString,
    status: parseAsString,
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-4 lg:flex-row lg:items-center',
        className,
      )}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--color-gray-400)]" />
        <Input
          className="pl-10"
          placeholder="Search by title or protocol number"
          value={filters.search}
          onChange={(event) => void setFilters({ search: event.target.value })}
        />
      </div>
      <select
        className="h-11 rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
        value={filters.phase ?? ''}
        onChange={(event) => void setFilters({ phase: event.target.value || null })}
      >
        <option value="">All phases</option>
        <option value="Phase I">Phase I</option>
        <option value="Phase II">Phase II</option>
        <option value="Phase III">Phase III</option>
        <option value="Phase IV">Phase IV</option>
      </select>
      <select
        className="h-11 rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
        value={filters.status ?? ''}
        onChange={(event) => void setFilters({ status: event.target.value || null })}
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="on_hold">On hold</option>
        <option value="completed">Completed</option>
        <option value="terminated">Terminated</option>
      </select>
      <Button
        variant="outline"
        onClick={() => void setFilters({ search: '', phase: null, status: null })}
      >
        Reset
      </Button>
    </div>
  )
}
