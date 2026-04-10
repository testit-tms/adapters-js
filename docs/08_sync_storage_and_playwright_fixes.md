# Sync Storage and adapters: current behavior

Short technical reference for `adapters-js` after the latest sync-storage fixes.

## 1) Commons (`BaseStrategy`)

- `setup()` starts sync-storage (if enabled), registers worker, sets worker status to `in_progress`, then starts test run in TMS.
- `loadTestRun()` processes **first result only** as sync candidate:
  - calls `sendInProgressTestResult(...)` to sync-storage,
  - posts TMS `InProgress` only when worker is sync **master** and cut publish returned `true`,
  - uploads finals for the rest of the batch (`autotests.slice(1)`).
- If worker is not master or cut publish failed, adapter uploads finals as-is (no TMS `InProgress` stub).
- `teardown()` always sets worker `completed` and calls sync completion flow.
- With active sync-storage, adapter **skips** `completeTestRun` in teardown (run completion belongs to sync-storage).

## 2) Sync-storage payload/logging

- Cut payload includes `statusType` + `statusCode` (mapped from outcome).
- `sendInProgressTestResult()` logs explicit skip reasons:
  - `notRunning`
  - `notMaster`
  - `alreadyInProgress`
  - incomplete payload fields
- Successful and failed publishes are logged with `workerPid` and `autoTestExternalId`.

## 3) Debugging

- Enable `TMS_DEBUG_LOAD_TEST_RUN=1` (or `true`) for ordered commons logs:
  - `loadTestRun enter`
  - sync publish result
  - InProgress stub sent/skipped reason
  - final uploads

## 4) Attachments (commons)

- Upload retries: up to 3 attempts, linear backoff (500ms * attempt) for transient network/server errors.
- No retries for 4xx responses.
- New file stream is used for every retry attempt.
- Attachments client timeout is increased to 120s.

## 5) Jest

- `globalSetup` does not run `strategy.setup()`; workers run setup locally.
- Environment registers early `unhandledRejection` handler before `super.setup()`.
- `run_finish` uses `try/finally`: `strategy.teardown()` is called even when result upload fails.
- Added setup diagnostics (`pid`, `testRunId`, sync active/master flags).

## 6) Playwright and Mocha

- Playwright reporter catches async upload/reporting failures to avoid crash from unhandled promise rejections.
- Mocha wraps sync setup/teardown paths with guarded error handling (`deasync-promise` path included).

## 7) Misc

- `externalId` and `autoTestExternalId` are excluded from HTML escaping in commons.
