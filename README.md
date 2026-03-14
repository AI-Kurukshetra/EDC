# Clinical Data Hub

Clinical Data Hub is a compliance-focused Electronic Data Capture platform for clinical research,
built with Next.js, TypeScript, Supabase, and Tailwind CSS.

## Stack

- Next.js 15 App Router
- TypeScript strict mode
- Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- Tailwind CSS 4
- React Hook Form + Zod
- TanStack Query
- Zustand

## Getting Started

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and populate the Supabase and Resend keys.
3. Run `pnpm dev`.

## Required Environment Variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `SUPABASE_PROJECT_REF`
- `RESEND_API_KEY`
- `RESEND_AUDIENCE_EMAIL`

## Supabase

- Schema migrations live in `supabase/migrations/`
- Edge Functions live in `supabase/functions/`
- Development seed data lives in `supabase/seed.sql`

## Quality Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
