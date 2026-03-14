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

- Phase 1 shell/account UX is complete, and Phase 2 is expanding `/admin` into a fuller governance and access-management workspace.

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
- Form-template save rules are now enforced server-side:
  - direct updates to published templates are rejected even if the client is bypassed
  - publishing a version retires the previous published version for the same study/form name
  - duplicate study/name/version conflicts return a clearer error message
- Seeded UUID parsing is now tolerant of deterministic Postgres fixture ids:
  - introduced a shared `PostgresUuidSchema` instead of strict `z.uuid()` checks
  - `/studies` no longer crashes on the seeded demo data after login
- App Router route imports were normalized to local relative imports for colocated page components.
- Repo gates after the CRF workspace change are green:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
- Production verification is green:
  - clean `pnpm build` now passes again
  - `pnpm start --hostname 127.0.0.1 --port 3001` serves correctly
  - verified live responses:
    - `/login` -> `200`
    - `/register` -> `200`
    - `/studies` -> `307` to login when signed out
    - `/studies/new` -> `307` to login when signed out
- Rendered eCRF data-entry workflow is now functionally connected:
  - `/studies/[studyId]/data` renders a live subject/form/visit workspace instead of a placeholder
  - CRF submission now invokes the existing `generate-queries` edge function so out-of-range or missing values raise automated queries after submit
- Placeholder study tabs have been replaced with live Phase 1 operations views backed by shared study queries:
  - `/studies/[studyId]/subjects`
  - `/studies/[studyId]/queries`
  - `/studies/[studyId]/sites`
  - `/studies/[studyId]/users`
  - `/studies/[studyId]/audit`
  - `/studies/[studyId]/export`
- Study export functionality is now wired:
  - added a server action that requests signed export jobs through the `export-data` edge function
  - the export screen shows current study scope and export history, and can generate CSV / JSON / CDISC downloads
- End-of-phase verification is now complete:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm format:check`
  - `pnpm build`
- Production runtime is serving the fresh build on `127.0.0.1:3001`:
  - `/login` -> `200`
  - `/register` -> `200`
  - `/studies` -> `307` to login when signed out
  - `/studies/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/data` -> `307` to login when signed out
  - `/studies/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/queries` -> `307` to login when signed out
  - `/studies/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/export` -> `307` to login when signed out
- Added a workspace-specific runtime workaround:
  - `scripts/fix-next-server-chunks.cjs`
  - wired through `postbuild` in `package.json`
  - copies `.next/server/chunks/*.js` into `.next/server/` so `next start` can resolve server chunks like `./463.js` in this environment
- Phase 1 shell/account UX is now filled in:
  - dashboard top nav shows the signed-in user's name, role, unread count, `Account`, and `Logout`
  - `/account` now exists and shows the current profile, site assignments, and sponsored studies
  - logout is wired through the existing server action in the live dashboard shell
- Phase 2 has started with `/admin`:
  - replaced the placeholder with a real platform-ops view for super admins
  - the admin workspace now shows role distribution, live user inventory, study ownership counts, site-assignment counts, unread notification load, recent audit activity, recent platform notifications, and local user filters
  - super admins can now update another user's platform role and active flag from the admin workspace
  - self-demotion and self-deactivation are blocked in both the UI and server action
  - `/admin` is now protected in middleware so non-super-admin users are redirected before the page renders
- Phase 2 platform notifications are now wired:
  - super admins can send notifications to one user, one role audience, or all active users from `/admin`
  - admin sees recent notification deliveries and read state in the same workspace
  - `/account` now shows a real inbox and supports marking one or all notifications as read
- Phase 2 admin provisioning has started in `/admin`:
  - super admins can now provision a new platform account with full name, email, platform role, and temporary password
  - provisioning can optionally attach the new user to an existing site with a site role
  - the provisioning action uses the service-role admin client, writes the profile role explicitly, creates the optional `site_users` assignment, sends a welcome inbox notification, and records an audit event
- Phase 2 study governance controls are now live in `/admin`:
  - super admins can reassign sponsor ownership and update study status from the same governance card
  - study governance changes now notify the sponsor owner and record audit events for sponsor/status changes
- Phase 2 site-access lifecycle controls are now live in `/admin`:
  - each platform user card now shows detailed site assignments with site role badges
  - super admins can add a new site assignment, update an existing site role, or remove site access without leaving the platform user inventory
  - site assignment changes notify the affected user and record audit events
- Gate/build verification is intentionally deferred until the end of the phase per user instruction.

## Current Blockers

- Remote migration history is not yet recorded in `supabase_migrations`, so future CLI-style migration reconciliation will need a repair step.
- `types/database.types.ts` is still the temporary placeholder and should be regenerated from the now-live schema when a clean type-generation path is available.
- In-thread Supabase MCP tools are still tied to older session bootstrap state, so fresh child processes or direct Management API calls remain the reliable remote-admin paths.
- Next.js warns about multiple lockfiles because `/Users/apple/package-lock.json` exists above the repo alongside this workspace's `pnpm-lock.yaml`; build succeeds, but the warning remains until the root inference is cleaned up.
- The current production-start fix depends on the `postbuild` chunk-copy workaround until the underlying Next.js server chunk-path mismatch is root-caused or eliminated.

## Exact Next Steps

1. Continue Phase 2 from the admin workspace:
   - continue from the new governance and site-access controls and choose the next bounded admin feature, such as invitation/password-reset onboarding polish or broader study oversight
2. Regenerate `types/database.types.ts` from the live schema when convenient.
3. Repair or backfill `supabase_migrations` before relying on CLI / migration-history workflows again.
4. Decide whether to keep or replace the `postbuild` server-chunk workaround after investigating the underlying Next.js runtime path mismatch.
5. Decide whether to silence the Next.js multi-lockfile warning by cleaning the parent `package-lock.json` situation or restoring a safe `outputFileTracingRoot`.

## Supabase Status

- Supabase MCP server exists as `supabase`.
- The config includes the requested features: `docs, account, database, debugging, development, functions, branching, storage`.
- Global Codex config currently declares `bearer_token_env_var = "SUPABASE_MCP_BEARER_TOKEN"`.
- Shell OAuth login completed successfully on March 14, 2026.
- Fresh child processes can start Supabase MCP when `.env.local` exports `SUPABASE_MCP_BEARER_TOKEN`.
- `.env.local` now contains a working `SUPABASE_SERVICE_ROLE_KEY`.
- Remote project `voevnebhnwqeslgpzauo` now has the application schema and demo data.
- `supabase_migrations` is still empty because the migrations were applied through the Management API rather than a tracked CLI push.
- Seeded deterministic UUID fixture ids are now handled by shared Postgres-compatible validation instead of strict RFC-variant checks.
- Export and auto-query edge functions are now wired into the study workflows from the app layer:
  - `generate-queries` is invoked after eCRF submission
  - `export-data` is invoked from the new study export action
- Production verification on March 14, 2026 is green with the current workspace-specific postbuild chunk-copy workaround in place.
- The signed-in dashboard shell now depends on live profile reads from `profiles` plus unread notification counts for the top-nav account state.
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
