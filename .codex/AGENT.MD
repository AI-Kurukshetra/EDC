# Clinical Data Hub — Frontend Engineering Instructions

> **For:** Any developer (human or AI agent) working on this codebase.
> **Stack:** Next.js 15 (App Router) · TypeScript 5 (strict) · Supabase · Tailwind CSS · shadcn/ui

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Project Structure](#3-project-structure)
4. [TypeScript Standards](#4-typescript-standards)
5. [Component Standards](#5-component-standards)
6. [State Management](#6-state-management)
7. [Data Fetching](#7-data-fetching)
8. [Forms & Validation](#8-forms--validation)
9. [Server Actions](#9-server-actions)
10. [Error Handling](#10-error-handling)
11. [Styling](#11-styling)
12. [Testing](#12-testing)
13. [Performance](#13-performance)
14. [Accessibility](#14-accessibility)
15. [Security](#15-security)
16. [Git & Workflow](#16-git--workflow)
17. [Forbidden Patterns](#17-forbidden-patterns)
18. [Quick Reference Card](#18-quick-reference-card)

---

## 0. Session Orchestrator

Before doing any substantive work in a new session, read:

1. `.codex/orchestrator/PARENT_THREAD.md`
2. `.codex/orchestrator/SESSION_POLICY.md`
3. `.codex/orchestrator/TASK_QUEUE.md`
4. `.codex/orchestrator/HANDOFF_TEMPLATE.md` (only when preparing a new handoff)

Rules:

- Treat `PARENT_THREAD.md` as the single compact parent context for session switching.
- Treat `SESSION_POLICY.md` as the law for parent/child session behavior.
- Treat `TASK_QUEUE.md` as the parent-managed work queue for child sessions.
- Update it at the end of any substantial session.
- Keep it compressed: current objective, verified status, blockers, next actions, and exact commands only.
- Replace stale bullets instead of appending long histories.
- When a session feels close to 80% context usage, stop new implementation, update the parent files, and continue in a fresh child session.
- If reconnect hits the token limit, retry up to 3 times; if it still fails, wait 10 seconds and continue in a fresh child session from the parent files.

---

## 1. Philosophy

These five principles govern every engineering decision in this codebase. When in doubt, apply them in order:

**1. Correctness first.**
Code that works but is wrong — wrong types, wrong patterns, wrong abstractions — creates compounding debt. Take the time to do it right.

**2. Explicit over clever.**
If you need a comment to explain what code does, rewrite the code. Name things so precisely that the code explains itself.

**3. Small units, clear contracts.**
Functions do one thing. Components render one concern. Types model one domain concept. The moment something has two responsibilities, split it.

**4. Co-location.**
What changes together lives together. A component's test lives next to it. A Server Action's Zod schema lives in the same domain folder. Don't separate by file type — separate by domain.

**5. Performance is designed in, not bolted on.**
Server Components by default. Streaming where there's latency. Code splitting for weight. Measure before optimizing, but architect for performance from the start.

---

## 2. Tech Stack & Versions

| Layer           | Technology                      | Notes                                |
| --------------- | ------------------------------- | ------------------------------------ |
| Framework       | Next.js 15 (App Router)         | **Never** use Pages Router           |
| Language        | TypeScript 5 — `strict: true`   | **Never** disable strict mode        |
| Database        | Supabase (PostgreSQL)           | All DB access via typed client       |
| Auth            | Supabase Auth + `@supabase/ssr` | HttpOnly cookies only                |
| Styling         | Tailwind CSS 4                  | No inline styles                     |
| UI Components   | shadcn/ui                       | Primitives only — compose above them |
| Form State      | React Hook Form + Zod           | Always paired                        |
| Server State    | TanStack Query v5               | Client fetching only                 |
| Global UI State | Zustand                         | One store per domain                 |
| URL State       | nuqs                            | Type-safe search params              |
| Animations      | Tailwind animate / CSS          | Motion library for complex           |
| Charts          | Recharts                        | Wrap in typed wrappers               |
| Package Manager | pnpm                            | Never mix with npm/yarn              |

---

## 3. Project Structure

```
src/
├── app/                    Next.js App Router (routing only)
├── components/             Shared, reusable React components
│   ├── ui/                 shadcn/ui — never edit these files
│   ├── layout/             App shell pieces (sidebar, nav)
│   ├── data-display/       Tables, cards, stats, empty states
│   ├── feedback/           Skeletons, alerts, dialogs
│   └── charts/             Recharts wrappers
├── lib/                    Non-React application logic
│   ├── actions/            Server Actions (one file per domain)
│   ├── queries/            Read-only RSC data fetchers
│   ├── validations/        Zod schemas (source of truth)
│   ├── hooks/              Custom React hooks
│   ├── stores/             Zustand stores
│   ├── supabase/           Supabase client helpers
│   └── utils/              Pure utility functions
├── types/                  TypeScript type definitions
│   ├── database.types.ts   Auto-generated — NEVER edit
│   └── index.ts            Domain types derived from DB
└── supabase/               Supabase config + migrations
    ├── migrations/         Numbered SQL files
    └── functions/          Edge Functions (Deno)
```

### Dependency Flow (One-Way — Enforce This)

```
app/ → components/ → lib/ → types/
```

- `app/` imports from anywhere below it
- `components/` imports from `lib/` and `types/` — **never** from `app/`
- `lib/` imports from `types/` — **never** from `components/` or `app/`
- `types/` imports nothing from the project

### Naming Conventions

| Item               | Convention              | Example             |
| ------------------ | ----------------------- | ------------------- |
| Folders & files    | `kebab-case`            | `study-card.tsx`    |
| React components   | `PascalCase` export     | `StudyCard`         |
| Custom hooks       | `use` + `camelCase`     | `useStudyData`      |
| Utilities          | `camelCase`             | `formatDate`        |
| Constants          | `SCREAMING_SNAKE_CASE`  | `MAX_SUBJECTS`      |
| Types / interfaces | `PascalCase`            | `StudyStatus`       |
| Zod schemas        | `PascalCase` + `Schema` | `CreateStudySchema` |
| Server Actions     | verb-first `camelCase`  | `createStudy`       |
| Stores             | domain + `Store`        | `useUiStore`        |

---

## 4. TypeScript Standards

### tsconfig.json — Always Use This Configuration

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
  },
}
```

### Type Patterns

```typescript
// ✅ Discriminated union — model complex state
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

// ✅ satisfies — validate shape without widening
const STATUS_LABELS = {
  active: 'Active',
  draft: 'Draft',
  completed: 'Completed',
} satisfies Record<StudyStatus, string>

// ✅ Const assertion for enum-like objects
const STUDY_PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'] as const
type StudyPhase = (typeof STUDY_PHASES)[number]

// ❌ Never — any type
const data: any = response.json()

// ❌ Never — type assertion without validation
const user = data as User

// ✅ Always — validate unknown input
const user = UserSchema.parse(data) // Zod validates at runtime
```

### Generating Database Types

After any schema change, regenerate types immediately:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Never** write database types manually. They will drift.

---

## 5. Component Standards

### Anatomy of a Component

```typescript
// Every component follows this structure:

// 1. Imports — external, then internal, then types
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { Study } from '@/types'

// 2. Type definition — always explicit, never inline
type StudyCardProps = {
  study: Study
  onSelect?: (id: string) => void
  className?: string
}

// 3. JSDoc — document exported components
/** Displays a summary card for a single clinical study. */
export function StudyCard({ study, onSelect, className }: StudyCardProps) {
  // 4. Hooks first
  const [isHovered, setIsHovered] = useState(false)

  // 5. Derived values / memos
  const statusLabel = STATUS_LABELS[study.status]

  // 6. Handlers — named functions, never inline arrows for complex logic
  function handleClick() {
    onSelect?.(study.id)
  }

  // 7. Early returns for loading/error/empty states
  if (!study) return null

  // 8. Render — clean JSX, no logic
  return (
    <div className={cn('...', className)}>
      ...
    </div>
  )
}

// 9. Private helpers below the export (not exported)
function formatStatusBadge(status: Study['status']) { ... }
```

### Server vs Client Components

```typescript
// Default is Server Component — no directive needed
// app/(dashboard)/studies/page.tsx
export default async function StudiesPage() {
  const studies = await getStudies()
  return <StudiesTable initialData={studies} />
}

// Add 'use client' ONLY for:
// - useState, useReducer, useEffect
// - Browser APIs
// - Event handlers directly on DOM
// - Third-party client-only libraries
'use client'
export function StudiesTable({ initialData }: { initialData: Study[] }) { ... }
```

---

## 6. State Management

### Decision Matrix

| Question                                             | Answer → Use                            |
| ---------------------------------------------------- | --------------------------------------- |
| Is it server data?                                   | TanStack Query (client) or RSC (server) |
| Does only one component need it?                     | `useState` local                        |
| Do multiple components need it, scoped to a subtree? | React Context                           |
| Is it app-wide UI state (sidebar, theme)?            | Zustand                                 |
| Is it a filter, search term, or page number?         | `nuqs` (URL state)                      |
| Can it be derived from other state?                  | Don't store it — compute it             |

### Zustand Store Pattern

```typescript
// lib/stores/ui.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export const useUiStore = create<UiState & UiActions>()(
  devtools(
    persist(
      immer((set) => ({
        sidebarOpen: true,
        toggleSidebar: () =>
          set((s) => {
            s.sidebarOpen = !s.sidebarOpen
          }),
      })),
      { name: 'ui-store' },
    ),
  ),
)

// Always use selectors — never destructure the whole store
const sidebarOpen = useUiStore((s) => s.sidebarOpen) // ✅
const { sidebarOpen } = useUiStore() // ❌ re-renders on any change
```

---

## 7. Data Fetching

### RSC — Server-Side (Default for page loads)

```typescript
// app/(dashboard)/studies/page.tsx — RSC
export default async function StudiesPage() {
  // ✅ Parallel — no waterfall
  const [studies, stats] = await Promise.all([
    getStudies(),
    getStudyStats(),
  ])
  return <StudiesView studies={studies} stats={stats} />
}
```

### TanStack Query — Client-Side Fetching

```typescript
// lib/hooks/use-studies.ts
export const studyKeys = {
  all: ['studies'] as const,
  list: (f?: Filters) => [...studyKeys.all, 'list', f] as const,
  detail: (id: string) => [...studyKeys.all, 'detail', id] as const,
}

export function useStudies(filters?: Filters) {
  return useQuery({
    queryKey: studyKeys.list(filters),
    queryFn: () => fetchStudies(filters),
    staleTime: 30_000,
  })
}
```

### Never use `useEffect` for data fetching.

Use RSC for server loads. Use TanStack Query for client loads.

---

## 8. Forms & Validation

### Always pair React Hook Form + Zod

```typescript
// 1. Define schema once — reused on client and server
// lib/validations/study.schema.ts
export const CreateStudySchema = z.object({
  title: z.string().min(3).max(200).trim(),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV']),
})
export type CreateStudyInput = z.infer<typeof CreateStudySchema>

// 2. Wire in component
const form = useForm<CreateStudyInput>({
  resolver: zodResolver(CreateStudySchema),
  defaultValues: { title: '', phase: undefined },
})
```

### Validation Mode

```typescript
// Use 'onTouched' — validates on blur first, then onChange after first touch
const form = useForm({ mode: 'onTouched' })
```

---

## 9. Server Actions

### Standard Pattern — Every Server Action

```typescript
// lib/actions/studies.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import { CreateStudySchema } from '@/lib/validations/study.schema'
import type { ActionResult } from '@/types/actions'

export async function createStudy(raw: unknown): Promise<ActionResult<{ id: string }>> {
  // 1. Auth check
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Validate input
  const parsed = CreateStudySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  // 3. Execute
  const { data, error } = await supabase.from('studies').insert(parsed.data).select('id').single()

  if (error) return { success: false, error: error.message }

  // 4. Revalidate cache
  revalidatePath('/studies')

  return { success: true, data }
}
```

### Action Result Type (Shared)

```typescript
// types/actions.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string | Record<string, string[]> }
```

---

## 10. Error Handling

### Hierarchy

```
Next.js error.tsx         ← segment-level boundary
  → React Error Boundary  ← component-level (manual)
    → try/catch           ← async operation level
      → ActionResult      ← Server Action return value
```

### Rules

- Every `async` function must handle errors — no silent failures
- RSC errors propagate to the nearest `error.tsx`
- Server Actions always return `ActionResult` — never throw to the client
- `console.error` is allowed; `console.log` is not (use proper logging)

---

## 11. Styling

### Tailwind Rules

```typescript
// ✅ Always use the cn() utility for conditional classes
import { cn } from '@/lib/utils/cn'

<div className={cn(
  'base-styles here',
  isActive && 'active-styles',
  className,          // always accept and spread className for composability
)} />

// ✅ CSS variables for design tokens
// globals.css
:root {
  --color-primary: 31 78 121;   /* HSL — without hsl() wrapper for Tailwind */
}

// ❌ Never inline styles
<div style={{ color: '#1F4E79' }} />

// ❌ Never use !important
// ❌ Never use arbitrary values for design system tokens
<div className="text-[#1F4E79]" />   // ❌ — use CSS variable instead
```

### Responsive Design

```typescript
// Mobile-first — base is mobile, add breakpoints upward
<div className="flex flex-col md:flex-row lg:grid lg:grid-cols-3" />

// Minimum breakpoints to support:
// sm: 640px  md: 768px  lg: 1024px  xl: 1280px
```

---

## 12. Testing

### Stack

- **Vitest** — unit and component tests
- **React Testing Library** — component rendering
- **MSW** — API/Supabase mocking
- **Playwright** — E2E critical flows

### Co-location Rule

Tests live next to the code they test:

```
components/data-display/study-card.tsx
components/data-display/__tests__/study-card.test.tsx   ✅

lib/utils/format.ts
lib/utils/__tests__/format.test.ts                      ✅
```

### What Must Be Tested

| What                                | Minimum Coverage               |
| ----------------------------------- | ------------------------------ |
| Pure utility functions              | 100%                           |
| Zod schemas (valid + invalid cases) | 100%                           |
| Custom hooks                        | All states + edge cases        |
| Components                          | Render + interactions + states |
| Server Actions                      | Happy path + validation errors |
| E2E                                 | All critical user flows        |

### Test Naming Convention

```typescript
describe('[Unit] formatDate', () => {
  it('formats ISO string as dd MMM yyyy', () => { ... })
  it('returns "—" for null input', () => { ... })
})

describe('[Component] StudyCard', () => {
  it('renders title and protocol number', () => { ... })
  it('calls onSelect with id when clicked', () => { ... })
})
```

---

## 13. Performance

### Server Components First

Default to RSC. Add `'use client'` only when strictly required (see §5).
Every `'use client'` directive should be a conscious, documented decision.

### Code Splitting

```typescript
// Heavy components that are not needed on initial load
const DataExportWizard = dynamic(
  () => import('@/components/export/data-export-wizard'),
  { loading: () => <Skeleton className="h-64 w-full" />, ssr: false }
)
```

### Images

```typescript
// Always next/image — never <img>
import Image from 'next/image'
<Image src="..." alt="..." width={800} height={600} priority={isAboveFold} />
```

### Memoization — Only After Profiling

```typescript
// ✅ Worth memoizing — expensive sort/filter on large array
const sorted = useMemo(() => subjects.sort(compareFn), [subjects])

// ❌ Not worth memoizing — trivial operation
const label = useMemo(() => name.toUpperCase(), [name])
```

---

## 14. Accessibility

Every interactive element must meet these requirements:

| Requirement    | How                                                    |
| -------------- | ------------------------------------------------------ |
| Semantic HTML  | Use `<button>`, `<a>`, `<input>` — not `<div onClick>` |
| Labels         | `aria-label` or visible text label on all controls     |
| Keyboard       | Enter/Space for buttons, arrow keys for lists/menus    |
| Focus visible  | `:focus-visible` ring — never `outline: none` alone    |
| Color contrast | 4.5:1 for normal text, 3:1 for large text (WCAG AA)    |
| Screen reader  | Test with VoiceOver / NVDA on critical flows           |
| Reduced motion | Respect `prefers-reduced-motion` in animations         |

---

## 15. Security

### Non-Negotiables

| Rule                                                     | Why                                   |
| -------------------------------------------------------- | ------------------------------------- |
| Validate ALL user input with Zod on the server           | Client validation is UX, not security |
| Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser  | Full DB access bypass                 |
| Never store auth tokens in `localStorage`                | XSS steals them trivially             |
| Use HttpOnly cookies for sessions                        | Supabase SSR handles this correctly   |
| Check auth at the start of every Server Action           | Never trust the caller                |
| Never use `dangerouslySetInnerHTML` without sanitization | XSS vector                            |
| No sensitive data in URL params or client-side state     | Logged, cached, shared                |
| Enable RLS on every Supabase table — no exceptions       | Defense in depth                      |

---

## 16. Git & Workflow

### Branch Naming

```
feature/CDH-123-add-subject-enrollment
fix/CDH-456-query-status-not-updating
chore/update-dependencies
refactor/extract-form-validation-hook
```

### Commit Message Format (Conventional Commits)

```
type(scope): short description

feat(subjects): add withdrawal workflow with data lock
fix(queries): correct auto-query trigger on date fields
refactor(forms): extract CRF renderer into composable hook
test(studies): add server action integration tests
chore: upgrade to Next.js 15.2
```

### PR Checklist

- [ ] TypeScript compiles with zero errors (`pnpm type-check`)
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] New features have tests
- [ ] No `console.log` statements
- [ ] No `any` types introduced
- [ ] Migrations are numbered and reversible

---

## 17. Forbidden Patterns

These patterns are banned in this codebase. No exceptions. No "just this once."

```typescript
// 1. The any escape hatch
const data: any = ...                         // ❌ Use unknown + Zod

// 2. Type assertion on unvalidated data
const user = response as User                 // ❌ Parse with Zod

// 3. useEffect for data fetching
useEffect(() => { fetch(...).then(setData) }, [])  // ❌ Use TanStack Query

// 4. useEffect for derived state
useEffect(() => { setFullName(f + ' ' + l) }, [f, l])  // ❌ Compute inline

// 5. Mutation outside Server Action
supabase.from('studies').insert(...)          // ❌ in a Client Component

// 6. Index as key
items.map((item, i) => <Item key={i} />)      // ❌ Use item.id

// 7. Optional chaining to hide missing error handling
const id = result?.data?.id                   // ❌ if result can be null, handle it

// 8. Inline complex logic in JSX
{items.filter(i => i.active).sort(...).map(render)}  // ❌ Extract to variable

// 9. Boolean flag state soup
{ isLoading, isError, isSuccess, isIdle }    // ❌ Use discriminated union

// 10. Skipping RLS "just for this query"
supabase.auth.admin.from(...)                 // ❌ only in Edge Functions
```

---

## 18. Quick Reference Card

```
NEED TO...                              DO THIS
──────────────────────────────────────────────────────────────────
Fetch data on page load                 async RSC + await in page.tsx
Fetch data on user interaction          TanStack Query useQuery
Mutate data from UI                     Server Action → revalidatePath
Share state across components           Zustand store (slice)
Share state in a component subtree      React Context
Store filters/search in URL             nuqs useQueryState
Validate user input                     Zod schema (shared client+server)
Handle form state                       React Hook Form + zodResolver
Display loading state                   loading.tsx skeleton
Handle errors from RSC                  error.tsx boundary
Handle errors from Server Actions       return ActionResult { success, error }
Model complex state                     Discriminated union
Generate DB types                       npx supabase gen types typescript
Test a pure function                    Vitest describe/it/expect
Test a component                        Vitest + React Testing Library
Test a critical flow                    Playwright E2E spec
```

---

_These instructions are the contract for this codebase. Consistency across all contributors — human and AI — is what makes a large application maintainable. When something is unclear, ask. When something is wrong in these docs, update them._
