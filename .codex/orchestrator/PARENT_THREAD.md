# Parent Thread

## Purpose

This file is the persistent orchestrator context for session changes.
Every new session should read this file first after the core agent instructions.

Keep this file compact:

- Prefer bullets over paragraphs.
- Replace stale items instead of stacking history.
- Capture only the current truth, not the whole story.

## Parent / Child Model

- Parent role:
  - maintain this file
  - maintain `.codex/orchestrator/TASK_QUEUE.md`
  - decide the next bounded child task
  - keep summaries compact for session switching
- Child role:
  - read parent files first
  - execute one bounded task at a time
  - update parent files before handing off
  - avoid mixing multiple unrelated features in one child session

## Context Budget Rule

- If the current session feels near 80% full, stop implementation and prepare handoff.
- If reconnect loops or rate-limit interruptions start happening repeatedly, prepare handoff.
- Do not start a new large subtask when close to the context limit.
- Always switch with a compact summary instead of stretching the same session.
- If reconnect fails 3 times because of token limits, wait 10 seconds and resume in a fresh child session.

## Read Order For New Sessions

1. `.codex/AGENT.MD`
2. `.codex/orchestrator/PARENT_THREAD.md`
3. `.codex/orchestrator/SESSION_POLICY.md`
4. `.codex/orchestrator/TASK_QUEUE.md`
5. Relevant files from `.codex/reference/` and `.codex/supabase/`
6. Only then inspect code and run commands

## Project

- Name: Clinical Data Hub
- Stack: Next.js 15 App Router, TypeScript strict, Tailwind 4, Supabase, TanStack Query, Zustand, RHF + Zod
- Package manager: `pnpm`

## Active Objective

- Continue `/studies/[studyId]/forms` product work now that the remote schema and demo data are live.

## Current State

- App scaffold is in place with auth flows, dashboard shell, study creation flow, Supabase migrations, and edge functions.
- CRF builder groundwork is now added:
  - `types/index.ts` includes form-template and CRF field types
  - `lib/validations/form-template.schema.ts`
  - `lib/utils/crf-builder.ts`
  - `lib/queries/form-templates.ts`
  - `lib/actions/form-templates.ts`
  - `lib/utils/crf-builder.test.ts`
- Parent/child orchestration files are in place:
  - `.codex/orchestrator/PARENT_THREAD.md`
  - `.codex/orchestrator/SESSION_POLICY.md`
  - `.codex/orchestrator/TASK_QUEUE.md`
- Quality gates are green:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
- `pnpm circular` passed with `madge`: no circular dependencies found.
- `pnpm deps:check` passed with `knip --dependencies`.
- `pnpm audit --audit-level=high` passed.
- `pnpm test` passed.
- Focused CRF utility tests pass.
- Manual gate cleanup completed:
  - added JSDoc comments to exported non-UI components
  - added `className` passthrough to reusable non-UI roots
  - removed the array-index key from `SkeletonTable`
  - split public env access from server-only env access to avoid secret-schema use in client code
- Unused packages were removed and the dependency scan script now uses `knip`.
- Supabase MCP config was updated to:
  - `https://mcp.supabase.com/mcp?project_ref=voevnebhnwqeslgpzauo&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage`
- Global Codex MCP config in `/Users/apple/.codex/config.toml` now points `mcp_servers.supabase` at project `voevnebhnwqeslgpzauo` and includes `bearer_token_env_var = "SUPABASE_MCP_BEARER_TOKEN"`.
- `codex mcp login supabase` completes successfully in shell.
- A fresh `codex exec` child can now start Supabase MCP when `.env.local` exports `SUPABASE_MCP_BEARER_TOKEN`.
- The old `[features] rmcp_client = true` entry is still present in global Codex config and logs as an unknown feature, though it is not the primary blocker.
- Local runtime diagnosis:
  - `.next` ownership issue was previously fixed by the user
  - current focus has moved back to product work because the app now has real remote schema/data
- `.env.local` now contains a valid `SUPABASE_SERVICE_ROLE_KEY`:
  - `supabase.auth.admin.listUsers()` succeeds against the remote project
  - direct table access with the admin key reaches the remote REST API
- Remote schema setup is complete:
  - `001_initial_schema.sql` applied successfully via Supabase Management API using the bearer token
  - `002_rls_policies.sql` applied successfully via Supabase Management API using the bearer token
  - `supabase_migrations` is still empty because the SQL was applied directly, not through the CLI migration tracker
- Demo seed is complete:
  - `pnpm seed:data` succeeded against the remote project
  - seeded counts verified with service-role access:
    - `profiles`: 5
    - `studies`: 1
    - `sites`: 2
    - `subjects`: 3
    - `form_templates`: 2
- `/studies/[studyId]/forms` workspace polish resumed:
  - published templates now become read-only in the builder
  - editing is steered through the existing `Next version` flow so published CRFs are not overwritten in place
- Repo gates after the CRF workspace change are green:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`

## Current Blockers

- Remote migration history is not yet recorded in `supabase_migrations`, so future CLI-style migration reconciliation will need a repair step.
- `types/database.types.ts` is still the temporary placeholder and should be regenerated from the now-live schema when a clean type-generation path is available.
- In-thread Supabase MCP tools are still tied to older session bootstrap state, so fresh child processes or direct Management API calls remain the reliable remote-admin paths.

## Exact Next Steps

1. Continue CRF/forms development on `/studies/[studyId]/forms` now that real remote data exists.
2. Regenerate `types/database.types.ts` from the live schema when convenient.
3. Repair or backfill `supabase_migrations` before relying on CLI / migration-history workflows again.
4. Keep gates green after each forms/CRF change.
5. After the CRF builder is stable, resume the downstream data-entry / rendered eCRF workflow on `/studies/[studyId]/data`.

## Supabase Status

- Supabase MCP server exists as `supabase`.
- The config includes the requested features: `docs, account, database, debugging, development, functions, branching, storage`.
- Global Codex config currently declares `bearer_token_env_var = "SUPABASE_MCP_BEARER_TOKEN"`.
- Shell OAuth login completed successfully on March 14, 2026.
- Fresh child processes can start Supabase MCP when `.env.local` exports `SUPABASE_MCP_BEARER_TOKEN`.
- `.env.local` now contains a working `SUPABASE_SERVICE_ROLE_KEY`.
- Remote project `voevnebhnwqeslgpzauo` now has the application schema and demo data.
- `supabase_migrations` is still empty because the migrations were applied through the Management API rather than a tracked CLI push.
- Remote seed credentials are verified with these demo logins:
  - `sponsor@clinicalhub.dev / Password123!`
  - `investigator@clinicalhub.dev / Password123!`
  - `coordinator@clinicalhub.dev / Password123!`
  - `monitor@clinicalhub.dev / Password123!`
  - `datamanager@clinicalhub.dev / Password123!`

## Useful Commands

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm circular`
- `pnpm deps:check`
- `pnpm audit --audit-level=high`
- `pnpm test`
- `rg -n "export (default )?(async )?function|export const [A-Z]" app components --glob '*.tsx' | rg -v 'components/ui/'`

## Session-End Update Rules

- Update only these sections when handing off:
  - `Active Objective`
  - `Current State`
  - `Current Blockers`
  - `Exact Next Steps`
  - `Supabase Status`
- Move completed or newly discovered work items in `.codex/orchestrator/TASK_QUEUE.md`.
- If switching because of context pressure, note that explicitly in the handoff.
- Keep the file short enough that a new session can absorb it quickly.
