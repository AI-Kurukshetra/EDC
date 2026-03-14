# Task Queue

## Active Child Task

- Run the deferred end-of-phase verification pass for the new Phase 1 study-operations surfaces and fix anything it exposes.
- Regenerate `types/database.types.ts` when a clean generation path is available.
- Repair / backfill `supabase_migrations` before relying on CLI migration-history workflows again.
- Keep gates green after each forms / CRF change and keep an eye on the non-blocking Next.js multi-lockfile warning during production builds.

## Next Child Tasks

- Decide whether Phase 1 needs any additional polish after the full verification pass.
- Refresh `PARENT_THREAD.md` at every handoff.

## Parked

- Revisit the Gate 4 tool policy later if the `madge` vs. scoring rule conflict needs to be formalized in the reference docs.

## Queue Rules

- Keep exactly one active child task block when possible.
- Move completed work out of the active block.
- Keep queue items short and execution-oriented.
