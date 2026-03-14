# Task Queue

## Active Child Task

- Continue Phase 2 after the governance, provisioning, notification, site-access, auth-recovery, study-oversight, document-register, signature-oversight, study-document, and study-signature slices, and choose the next bounded feature.
- Regenerate `types/database.types.ts` when a clean generation path is available.
- Repair / backfill `supabase_migrations` before relying on CLI migration-history workflows again.
- Decide whether to keep or replace the `postbuild` server-chunk workaround after root-causing the Next.js runtime-path issue.
- End-of-phase gate/build verification is intentionally deferred for now.

## Next Child Tasks

- Add the next Phase 2 capability after the study signature flow, such as document update/version controls or broader signature coverage for other record types.
- Refresh `PARENT_THREAD.md` at every handoff.

## Parked

- Revisit the Gate 4 tool policy later if the `madge` vs. scoring rule conflict needs to be formalized in the reference docs.

## Queue Rules

- Keep exactly one active child task block when possible.
- Move completed work out of the active block.
- Keep queue items short and execution-oriented.
