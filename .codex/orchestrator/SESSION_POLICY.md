# Session Policy

## Goal

Use a parent/child session model so long tasks can continue across session changes with low token overhead.

## Parent Session Rules

- The parent session owns orchestration only.
- The parent session maintains:
  - `.codex/orchestrator/PARENT_THREAD.md`
  - `.codex/orchestrator/TASK_QUEUE.md`
- The parent session should avoid broad implementation work unless no child handoff is needed.
- The parent session assigns one bounded task to each child session.

## Child Session Rules

- A child session must read, in order:
  1. `.codex/AGENT.MD`
  2. `.codex/orchestrator/PARENT_THREAD.md`
  3. `.codex/orchestrator/SESSION_POLICY.md`
  4. `.codex/orchestrator/TASK_QUEUE.md`
- A child session should work on one bounded task at a time.
- A child session must update parent files before ending.
- A child session should not start a second large task if the first one is still open.

## 80% Context Rule

- When the session feels near 80% context usage, stop new implementation.
- Prepare the handoff before the session becomes cramped.
- If reconnect loops or context pressure appear, switch early instead of late.
- The threshold is operational, not exact:
  - if the summary is getting long
  - if the task has multiple sub-results to preserve
  - if the session starts failing or reconnecting
  - switch

## Reconnect / Rate-Limit Rule

- If reconnect or TPM-limit recovery starts happening, retry up to 3 times.
- If the third retry still fails, wait 10 seconds.
- After that wait, continue in a fresh child session from the parent files.
- Treat that switch as automatic workflow, even if the exact new chat must be opened outside the current session.

## Handoff Procedure

1. Stop starting new work.
2. Finish the smallest safe checkpoint.
3. Update `.codex/orchestrator/PARENT_THREAD.md`.
4. Update `.codex/orchestrator/TASK_QUEUE.md`.
5. Use `.codex/orchestrator/HANDOFF_TEMPLATE.md` to keep the summary compact.
6. Start the next child session from the parent files.
7. If the trigger was rate limiting, apply the 3-retry then 10-second-wait rule before starting that child session.

## Scope Rules

- Good child task examples:
  - fix one failing gate
  - implement one route
  - add one migration
  - resolve one dependency scan
- Bad child task examples:
  - finish the entire app
  - mix auth, forms, and infra in one pass
  - keep working after the session is already overloaded

## Recovery Rule

- If a child session stops unexpectedly, the next child session should trust the parent files, not the missing chat history.
- If parent files are stale, refresh them before resuming code changes.
