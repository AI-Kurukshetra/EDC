# State Management — Reference

## State Taxonomy

Choose the right tool for each category of state:

| State Type          | Description                         | Solution                          |
| ------------------- | ----------------------------------- | --------------------------------- |
| **Server state**    | Data that lives in the DB / API     | TanStack Query or RSC + `cache()` |
| **Global UI state** | Auth session, theme, sidebar open   | Zustand                           |
| **Local UI state**  | Modal open, tab selected, accordion | `useState`                        |
| **Form state**      | Input values, validation errors     | React Hook Form                   |
| **URL state**       | Search params, filters, pagination  | `useSearchParams` + `nuqs`        |
| **Derived state**   | Computed from other state           | `useMemo` or inline expression    |

## Decision Rule: Where Does This State Live?

```
Can this state be derived from other state?
├─ YES → Don't store it. Compute it inline or with useMemo.
└─ NO
   ├─ Does only ONE component need it?
   │   └─ YES → useState local to that component
   ├─ Does it need to survive navigation / page loads?
   │   ├─ YES + It's server data → TanStack Query / RSC
   │   └─ YES + It's pure UI → Zustand (persist middleware if needed)
   └─ Is it scoped to a subtree of components?
       └─ YES → React Context (only for stable, low-frequency data)
```

## Zustand — Global UI State

```typescript
// lib/stores/ui.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type UiState = {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
}

type UiActions = {
  toggleSidebar: () => void
  setTheme: (theme: UiState['theme']) => void
}

export const useUiStore = create<UiState & UiActions>()(
  devtools(
    persist(
      immer((set) => ({
        // ─── Initial state ───
        sidebarOpen: true,
        theme: 'system',

        // ─── Actions ────────
        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen
          }),

        setTheme: (theme) =>
          set((state) => {
            state.theme = theme
          }),
      })),
      { name: 'ui-store' },
    ),
  ),
)
```

**Zustand rules:**

- One store per domain — never one giant store
- Use `immer` middleware for nested state mutations
- Use `devtools` middleware in development
- Use `persist` only for state that genuinely needs to survive refresh
- Select slices to avoid unnecessary re-renders:

  ```typescript
  // ✅ Selector — only re-renders when sidebarOpen changes
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  // ❌ No selector — re-renders on every store change
  const store = useUiStore()
  ```

## TanStack Query — Client-Side Server State

Use for data that is fetched on the client (interactive pages, real-time updates).

```typescript
// lib/hooks/use-studies.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudies, createStudy } from '@/lib/actions/studies'
import { toast } from 'react-hot-toast'

// ─── Query keys — centralise to avoid typos ──────────────────────────────────
export const studyKeys = {
  all: ['studies'] as const,
  list: (filters?: StudyFilters) => [...studyKeys.all, 'list', filters] as const,
  detail: (id: string) => [...studyKeys.all, 'detail', id] as const,
}

// ─── Query hook ──────────────────────────────────────────────────────────────
export function useStudies(filters?: StudyFilters) {
  return useQuery({
    queryKey: studyKeys.list(filters),
    queryFn: () => getStudies(filters),
    staleTime: 30_000, // 30s before refetch
    gcTime: 5 * 60_000, // 5min cache retention
  })
}

// ─── Mutation hook with optimistic update ────────────────────────────────────
export function useCreateStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStudy,
    onMutate: async (newStudy) => {
      await queryClient.cancelQueries({ queryKey: studyKeys.all })
      const previous = queryClient.getQueryData(studyKeys.list())
      queryClient.setQueryData(studyKeys.list(), (old: Study[] = []) => [
        ...old,
        { ...newStudy, id: 'temp-id', status: 'draft' as const },
      ])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(studyKeys.list(), ctx?.previous)
      toast.error('Failed to create study')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.all })
      toast.success('Study created')
    },
  })
}
```

## React Context — Scoped Stable Data

Only use Context for data that is:

1. Stable (changes rarely)
2. Scoped to a specific subtree
3. Not server state

```typescript
// app/(dashboard)/studies/[studyId]/_context/study-context.tsx
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Study } from '@/types'

type StudyContextValue = {
  study: Study
  userRole: string
}

const StudyContext = createContext<StudyContextValue | null>(null)

export function StudyProvider({
  children,
  value,
}: {
  children: ReactNode
  value: StudyContextValue
}) {
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
}

// ✅ Custom hook with built-in null check — never expose context directly
export function useStudyContext(): StudyContextValue {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudyContext must be used within StudyProvider')
  return ctx
}
```

## URL State — Filters, Search, Pagination

Use `nuqs` for type-safe URL search params:

```typescript
// app/(dashboard)/studies/_components/studies-filters.tsx
'use client'

import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'

export function StudiesFilters() {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [status, setStatus] = useQueryState('status', parseAsString)

  // URL automatically updates: /studies?q=oncology&status=active&page=2
  // Browser back/forward works correctly
  // SSR-compatible — no hydration mismatch
}
```

## Anti-Patterns

```typescript
// ❌ useEffect for derived state
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(`${firstName} ${lastName}`)
}, [firstName, lastName])

// ✅ Derive inline
const fullName = `${firstName} ${lastName}`

// ❌ Storing server data in useState
const [studies, setStudies] = useState([])
useEffect(() => {
  fetch('/api/studies')
    .then((r) => r.json())
    .then(setStudies)
}, [])

// ✅ Use TanStack Query or RSC
const { data: studies } = useStudies()

// ❌ Prop drilling through 4+ levels
// ✅ Zustand store or Context (scoped) for shared state
```
