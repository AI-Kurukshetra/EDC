# Components — Reference

## Component Architecture Layers

```
Primitives (shadcn/ui)         ← Never modify directly
    ↓
Composed UI Components         ← components/ui/ wrappers with app-specific defaults
    ↓
Domain Components              ← components/[domain]/ with business knowledge
    ↓
Page Sections                  ← app/[route]/_components/ — non-reusable, co-located
```

## The Canonical Component Template

Every component must follow this structure:

```typescript
// components/data-display/study-card.tsx

import type { Study } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

/** Display card for a single clinical study. Used in the studies list view. */

type StudyCardProps = {
  study: Study
  /** Whether this card is in a selected/active state */
  isSelected?: boolean
  /** Called when the user clicks the card */
  onSelect?: (id: string) => void
  className?: string
}

export function StudyCard({
  study,
  isSelected = false,
  onSelect,
  className,
}: StudyCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        className,
      )}
      onClick={() => onSelect?.(study.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.(study.id)
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{study.title}</CardTitle>
          <Badge variant={statusVariant(study.status)}>{study.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{study.protocolNumber}</p>
        <p className="mt-1 text-sm">
          Started: {formatDate(study.startDate)}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Private helpers (not exported) ─────────────────────────────────────────

function statusVariant(
  status: Study['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map = {
    active: 'default',
    draft: 'secondary',
    completed: 'outline',
    terminated: 'destructive',
    on_hold: 'secondary',
  } as const
  return map[status] ?? 'secondary'
}
```

## Rules

### Props

- Destructure props with defaults inline — never default in the function body
- Props that are React nodes: type as `React.ReactNode`
- Callback props: name as `on[Event]` — `onSelect`, `onChange`, `onSubmit`
- Never spread `...props` onto a DOM element — be explicit or use a compound `rest` type
- All optional props must have meaningful defaults or `undefined` handling

### Children Patterns

```typescript
// ✅ Explicit slot pattern — preferred for complex layouts
type CardProps = {
  header: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

// ✅ Render prop — when the parent needs to control child rendering
type ListProps<T> = {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
}

// ❌ Avoid — too generic, loses type safety
type BadProps = { children: any }
```

### Compound Components

Use for components with tightly-coupled sub-parts:

```typescript
// components/ui/data-table/index.tsx
export { DataTable } from './data-table'
export { DataTableToolbar } from './data-table-toolbar'
export { DataTablePagination } from './data-table-pagination'
export type { DataTableColumn } from './types'
```

### Accessibility Checklist

Every interactive component must have:

- [ ] Semantic HTML element (button, a, input — not div with onClick)
- [ ] `aria-label` or visible text label
- [ ] Keyboard interaction (Enter/Space for buttons, arrows for lists)
- [ ] Focus visible style (`:focus-visible` ring)
- [ ] `disabled` state handled without `pointer-events: none` alone
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text

### Error Boundaries

Wrap every major section:

```typescript
// app/(dashboard)/studies/error.tsx — Next.js automatic error boundary
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StudiesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### Loading Skeletons

Every page that fetches data must have a `loading.tsx` skeleton:

```typescript
// app/(dashboard)/studies/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function StudiesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />         {/* Page title */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}
```

### Component Anti-Patterns to Avoid

```typescript
// ❌ Logic in JSX — extract to variables or hooks
<div>{items.filter(i => i.active).sort((a,b) => ...).map(i => ...)}</div>

// ✅ Clean JSX, logic extracted
const sortedActiveItems = useMemo(
  () => items.filter((i) => i.active).sort(compareByDate),
  [items],
)
// <div>{sortedActiveItems.map(...)}</div>

// ❌ Nested ternaries
{isLoading ? <Spinner /> : isError ? <Error /> : data ? <Content /> : null}

// ✅ Guard clauses / early returns
if (isLoading) return <Spinner />
if (isError) return <Error />
if (!data) return null
return <Content data={data} />
```
