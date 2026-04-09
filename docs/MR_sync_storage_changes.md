# MR: Sync Storage Default Integration + Playwright Stability Fixes

## Summary

This MR introduces a production-focused Sync Storage integration in `testit-js-commons` and aligns adapter lifecycle behavior so Sync Storage works consistently across JS frameworks.

In parallel, it includes critical Playwright and commons fixes to prevent reporting/data regressions.

Follow-up changes document: **Sync Storage cut model `statusType`**, explicit **InProgress** first write to Test IT, **Jest** `globalThis.strategy` + attachment resilience, and **Mocha/Playwright** hardening around transient network errors (`ECONNRESET`).

## Why

We needed to:

- make Sync Storage the default execution path (with safe fallback),
- preserve legacy adapter behavior,
- prevent hierarchy corruption in Test IT (`namespace`/`classname`) on hook/fixture failures,
- ensure fixture-originated steps are visible in Playwright reporting,
- prevent `externalId`/`autoTestExternalId` mutation caused by HTML escaping.

## Main Changes

### 1) Sync Storage support in commons (default-enabled)

- Added new service layer:
  - `testit-js-commons/src/services/syncstorage/syncstorage.runner.ts`
  - `testit-js-commons/src/services/syncstorage/syncstorage.type.ts`
  - `testit-js-commons/src/services/syncstorage/index.ts`
- Exported through:
  - `testit-js-commons/src/services/index.ts`
- Integrated in:
  - `testit-js-commons/src/strategy/base.strategy.ts`

Behavior:

- `setup()`:
  - starts/connects Sync Storage,
  - registers worker,
  - sets worker status to `in_progress`.
- `loadTestRun()`:
  - sends in-progress cut result through Sync Storage (master/dedupe guarded), including **`statusType`** on the cut model (aligned with `TestRunConverter.mapToStatusType`: `Succeeded` / `Failed` / `Incomplete`),
  - after a **successful** Sync Storage publish, sends a **first** result to Test IT via `setAutoTestResultsForTestRun` with **`statusType: "InProgress"`** (`postInProgressAutotestResult`),
  - then sends final results to Test IT as before (`loadAutotests`).
- `teardown()`:
  - sets worker status to `completed`,
  - tries `wait_completion`, then falls back to `force_completion`,
  - completes test run in Test IT.

### 2) Config updates (default Sync Storage behavior)

Added config properties:

- `syncStorageEnabled?: boolean`
- `syncStoragePort?: string`

Added env variables:

- `TMS_SYNC_STORAGE_ENABLED`
- `TMS_SYNC_STORAGE_PORT`

Defaults:

- `syncStorageEnabled = true`
- `syncStoragePort = "49152"`

### 3) Sync Storage runner hardening

- HTTP timeout and retries for Sync Storage API requests.
- Safe response parsing for empty/non-JSON bodies.
- GitHub redirect support for binary download.
- Startup polling and warm-up handling.
- Completion fallback (`wait_completion` -> `force_completion`).

### 4) Adapter lifecycle alignment

Updated adapters to ensure Sync Storage lifecycle is actually executed:

- **Playwright**
  - runs `setup()` on `onBegin`,
  - runs `teardown()` on `onEnd`,
  - fixed skipped-tests async race (`Promise.all`),
  - attachment upload failures (`ECONNRESET`, etc.) are caught so they do not cause `ERR_UNHANDLED_REJECTION` or fail the run.
- **Cucumber**
  - added setup promise and await before final processing.
- **TestCafe reporter**
  - added setup at initialization and teardown at run end.
- **Mocha**
  - made run-begin setup blocking,
  - hardened `onEndRun` / `teardown` with `catch` and a one-shot guard so network errors do not trigger `deasync-promise` / `superagent` double-callback noise.
- **Jest**
  - `globalSetup` assigns `globalThis.strategy` after `setup()`; `TestItEnvironment` reuses it when defined (same Node process, e.g. `jest --runInBand`),
  - attachment queue: `.catch` on upload promises and `Promise.allSettled` before `saveResult` / `loadResults` so transient `ECONNRESET` does not drop test cases or fail the file.

### 5) Reporting/data integrity fixes

- Playwright now uses full step tree (`TestResult.steps`) with recursive extraction for fixture-originated steps.
- Playwright + commons prevent accidental `namespace`/`classname` overwrite when metadata is absent.
- Commons HTML escaping excludes:
  - `externalId`
  - `autoTestExternalId`

## Backward Compatibility

- Existing upload flow to Test IT remains intact.
- Sync Storage can be explicitly disabled:

```bash
TMS_SYNC_STORAGE_ENABLED=false
```

## Validation

### Unit tests

- `testit-js-commons` tests pass:
  - Sync Storage runner tests
  - Config defaults/overrides tests
  - HTML escaping tests

### Build verification

Builds passed for:

- `testit-js-commons`
- `testit-adapter-playwright`
- `testit-adapter-cucumber`
- `testcafe-reporter-testit`
- `testit-adapter-mocha`
- (validated earlier in the branch: `jest`, `cypress`)

## Risk Notes

- Sync Storage binary download relies on GitHub availability in CI/runtime environments.
- For locked-down environments, set `TMS_SYNC_STORAGE_ENABLED=false` or provide a pre-running Sync Storage instance.
- **Jest workers:** child processes do not share `globalThis.strategy` from `globalSetup`. For full Sync Storage + shared `strategy` instance, prefer **`jest --runInBand`** (or equivalent single-worker execution) when using `globalSetup` + this reporter pattern.

## Rollback Plan

If needed, disable Sync Storage at runtime without code rollback:

```bash
TMS_SYNC_STORAGE_ENABLED=false
```
