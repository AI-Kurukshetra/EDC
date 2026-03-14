# Data Fetching — Reference

## Decision Matrix

| Scenario                             | Pattern                           |
| ------------------------------------ | --------------------------------- |
| Initial page load, SEO-critical data | RSC + `async/await` in `page.tsx` |
| Data shared across many RSC routes   | `unstable_cache` / `cache()`      |
| Interactive client-side fetching     | TanStack Query                    |
| Real-time subscriptions              | Supabase Realtime + `useEffect`   |
| Mutations from client                | Server Actions                    |
| Webhooks / external callbacks        | Route Handlers (`app/api/`)       |

## RSC Data Fetching (Server)

```typescript
// app/(dashboard)/studies/page.tsx
import { Suspense } from 'react'
import { getStudies } from '@/lib/queries/studies'
import { StudiesTable } from './_components/studies-table'
import { StudiesTableSkeleton } from './_components/studies-table-skeleton'

// ✅ Parallel fetching — no waterfall
export default async function StudiesPage() {
  return (
    <Suspense fallback={<StudiesTableSkeleton />}>
      <StudiesContent />
    </Suspense>
  )
}

async function StudiesContent() {
  const studies = await getStudies()     // awaited inside Suspense boundary
  return <StudiesTable studies={studies} />
}
```

```typescript
// lib/queries/studies.ts
import { unstable_cache } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase/server'
import type { Study } from '@/types'

export const getStudies = unstable_cache(
  async (): Promise<Study[]> => {
    const supabase = await getServerSupabase()
    const { data, error } = await supabase
      .from('studies')
      .select('id, title, protocol_number, phase, status, start_date')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data
  },
  ['studies-list'],
  { revalidate: 60, tags: ['studies'] }, // revalidate every 60s or on tag
)
```

## Parallel vs Sequential Fetching

```typescript
// ❌ Sequential — creates waterfall (n requests × latency)
const study = await getStudy(studyId)
const subjects = await getSubjects(studyId)
const queries = await getOpenQueries(studyId)

// ✅ Parallel — all fire simultaneously
const [study, subjects, queries] = await Promise.all([
  getStudy(studyId),
  getSubjects(studyId),
  getOpenQueries(studyId),
])
```

## Supabase Realtime (Client)

```typescript
// lib/hooks/use-study-realtime.ts
'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { studyKeys } from '@/lib/hooks/use-studies'

export function useStudyRealtime(studyId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`study-${studyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          // Invalidate the relevant query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: studyKeys.detail(studyId) })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studyId, queryClient])
}
```

## Supabase Client Patterns

```typescript
// lib/supabase/server.ts — per-request server client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function getServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )
}

// lib/supabase/client.ts — singleton browser client
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserSupabase() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return client
}
```

## Error Handling in Queries

```typescript
// lib/queries/studies.ts
export async function getStudy(id: string): Promise<Study> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    // Map Supabase errors to meaningful messages
    if (error.code === 'PGRST116') throw new NotFoundError(`Study ${id} not found`)
    throw new Error(`Failed to fetch study: ${error.message}`)
  }

  return data
}

// In page.tsx — Next.js catches thrown errors at the nearest error.tsx boundary
export default async function StudyPage({ params }: { params: { studyId: string } }) {
  const study = await getStudy(params.studyId)  // throws → caught by error.tsx
  return <StudyDetail study={study} />
}
```

## Pagination Pattern

```typescript
// Cursor-based pagination for large datasets
export async function getSubjectsPaginated(studyId: string, cursor?: string, limit = 25) {
  const supabase = await getServerSupabase()

  let query = supabase
    .from('subjects')
    .select('*', { count: 'exact' })
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor) // cursor = last item's created_at
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    items: data,
    total: count ?? 0,
    nextCursor: data.length === limit ? data[data.length - 1]?.created_at : null,
  }
}
```
