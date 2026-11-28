---
name: sync-storage-js
description: >-
  Sync-storage rules for adapters-js (testit-js-commons SyncStorageRunner).
  Use when changing sync-storage start/stop, ports, wait-completion,
  process exit hooks, CI pipelines, or porting Java/Python sync-storage fixes to JS.
---

# Sync-storage in adapters-js

## Hard rules

- Do **not** finalize test-result status via `PUT /api/v2/testResults/{id}`. Finals = Work X / send-test-result.
- Prefer port bump (`preferred .. +SYNC_STORAGE_PORT_MAX_BUMP`) over fail-fast / silent “no sync-storage” when the preferred port has another `testRunId` or start/register loses a race.

## Process exit / kill — do not reintroduce CI regressions

Python CI/CD had failures from `atexit` + terminate of sync-storage. Same constraint for JS:

- Spawn SS with `detached: true` (and `unref`) so Work X can outlive the test runner.
- **Do not** register `process.on('exit' | 'beforeExit' | 'SIGINT')` hooks that kill SS or block on `/wait-completion`.
- Wait for Work X via existing `completeProcessing()` in strategy teardown (or external CI curl), not exit hooks.

### Correct JS lifecycle

| Concern | Approach |
|---------|----------|
| Spawn | `spawn(..., { detached: true, stdio: "ignore" })` + `unref()` |
| Kill on adapter exit | **No** (except cleanup of a **failed** start attempt) |
| Wait for Work X | `completeProcessing()` → `/wait-completion` |
| Worker `completed` | set status only — **no** wait-completion mid-run |
| Foreign port / race | Try `port+1` …; rebind API client to effective port |

## Touchpoints

- `testit-js-commons/src/services/syncstorage/syncstorage.runner.ts`
- Docs: `docs/sync-storage-port-bump-and-wait-completion.md`, `docs/sync-storage-verification-checklist.md`
