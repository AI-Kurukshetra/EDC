# Task Queue

## Active Child Task

- Continue `/studies/[studyId]/forms` CRF builder development on top of the live remote schema and seeded demo data now that published-version rules are enforced on both the client and server.
- Regenerate `types/database.types.ts` when a clean generation path is available.
- Repair / backfill `supabase_migrations` before relying on CLI migration-history workflows again.
- Keep gates green after each forms / CRF change and keep an eye on the non-blocking Next.js multi-lockfile warning during production builds.

## Next Child Tasks

- Resume the downstream rendered eCRF and data-entry workflow on `/studies/[studyId]/data`.
- Refresh `PARENT_THREAD.md` at every handoff.

## Parked

- Revisit the Gate 4 tool policy later if the `madge` vs. scoring rule conflict needs to be formalized in the reference docs.

## Queue Rules

- Keep exactly one active child task block when possible.
- Move completed work out of the active block.
- Keep queue items short and execution-oriented.
