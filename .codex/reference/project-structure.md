# Project Structure — Reference

## Canonical Next.js + TypeScript + Supabase Layout

```
clinical-data-hub/
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Route group: no URL prefix
│   │   ├── login/
│   │   │   ├── page.tsx              # RSC page
│   │   │   ├── loading.tsx           # Streaming skeleton
│   │   │   └── _components/          # Co-located, private components
│   │   │       └── login-form.tsx    # 'use client' form
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Dashboard shell (RSC)
│   │   ├── page.tsx                  # Global dashboard (RSC)
│   │   ├── error.tsx                 # Error boundary (Client)
│   │   ├── loading.tsx
│   │   └── studies/
│   │       ├── page.tsx
│   │       ├── new/
│   │       │   └── page.tsx
│   │       └── [studyId]/
│   │           ├── layout.tsx        # Study shell with tab nav
│   │           ├── page.tsx          # Study overview
│   │           ├── error.tsx
│   │           ├── loading.tsx
│   │           ├── subjects/
│   │           ├── forms/
│   │           ├── data/
│   │           ├── queries/
│   │           ├── audit/
│   │           └── export/
│   ├── api/                          # Route Handlers (webhooks, OAuth callbacks only)
│   │   └── webhooks/
│   └── globals.css
│
├── components/                       # Shared, reusable components
│   ├── ui/                           # shadcn/ui primitives (DO NOT edit directly)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/                       # App-level layout pieces
│   │   ├── sidebar.tsx
│   │   ├── top-nav.tsx
│   │   └── breadcrumbs.tsx
│   ├── data-display/                 # Tables, lists, stats
│   │   ├── data-table.tsx            # Generic sortable/paginated table
│   │   ├── stat-card.tsx
│   │   └── empty-state.tsx
│   ├── feedback/                     # Alerts, toasts, skeletons
│   │   ├── skeleton-table.tsx
│   │   ├── error-alert.tsx
│   │   └── confirmation-dialog.tsx
│   └── charts/                       # Recharts wrappers
│       ├── enrollment-bar-chart.tsx
│       └── completion-donut-chart.tsx
│
├── lib/                              # Non-React application logic
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (singleton)
│   │   ├── server.ts                 # Server client (per-request)
│   │   └── middleware.ts             # Session refresh helper
│   ├── actions/                      # Server Actions — one file per domain
│   │   ├── studies.ts
│   │   ├── subjects.ts
│   │   ├── data-entries.ts
│   │   └── queries.ts
│   ├── queries/                      # Read-only data fetching (RSC)
│   │   ├── studies.ts
│   │   ├── subjects.ts
│   │   └── ...
│   ├── validations/                  # Zod schemas — source of truth for shapes
│   │   ├── study.schema.ts
│   │   ├── subject.schema.ts
│   │   └── common.schema.ts
│   ├── hooks/                        # Custom React hooks (client only)
│   │   ├── use-study-realtime.ts
│   │   ├── use-optimistic-mutation.ts
│   │   └── use-debounce.ts
│   └── utils/                        # Pure functions, no React, no side effects
│       ├── format.ts                 # Date, number, string formatters
│       ├── cn.ts                     # Tailwind class merge utility
│       └── crypto.ts                 # SHA-256 signature hash
│
├── types/                            # TypeScript type definitions
│   ├── database.types.ts             # Auto-generated from Supabase — NEVER edit manually
│   ├── actions.ts                    # Shared action result types
│   └── index.ts                      # Domain types derived from DB types
│
├── supabase/
│   ├── migrations/                   # Numbered SQL files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_seed_data.sql
│   ├── functions/                    # Edge Functions (Deno)
│   │   ├── audit-log/
│   │   ├── generate-queries/
│   │   ├── export-data/
│   │   └── send-notification/
│   └── config.toml
│
├── __tests__/                        # Integration tests (non-co-located)
│   └── actions/
│       └── studies.test.ts
│
├── middleware.ts                     # Next.js middleware (auth guard)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json                     # strict: true always
├── .eslintrc.json
├── .prettierrc
├── .env.example
└── README.md
```

## Dependency Flow Rules

Enforce one-way dependencies. No circular imports.

```
app/  →  components/  →  lib/  →  types/
                    ↘           ↗
                      (never reverse)
```

- `app/` can import from `components/`, `lib/`, `types/`
- `components/` can import from `lib/`, `types/` — NEVER from `app/`
- `lib/` can import from `types/` — NEVER from `components/` or `app/`
- `types/` imports nothing from the project

## Environment Variables Pattern

```typescript
// lib/env.ts — validate at startup, fail fast
import { z } from 'zod'

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
})

export const env = EnvSchema.parse(process.env)
// Throws at startup if any variable is missing — never silently undefined
```

## File Naming Decision Tree

```
Is this a Next.js routing file?
├─ YES → use Next.js convention: page.tsx, layout.tsx, loading.tsx, error.tsx
└─ NO
   ├─ Is it a React component? → PascalCase.tsx (e.g. StudyCard.tsx)
   ├─ Is it a hook?            → use-kebab-case.ts (e.g. use-study-data.ts)
   ├─ Is it a utility?         → kebab-case.ts (e.g. format-date.ts)
   ├─ Is it a Zod schema?      → kebab-case.schema.ts (e.g. study.schema.ts)
   └─ Is it a type file?       → kebab-case.types.ts OR types/index.ts
```
