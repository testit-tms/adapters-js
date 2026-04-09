# Sync Storage Improvements Summary

This document summarizes the implementation and hardening work completed for Sync Storage integration in `adapters-js`.

## Scope

The goal was to make Sync Storage a reliable default execution path across JS adapters while preserving existing adapter behavior and compatibility.

## Implemented Improvements

### 1) Core integration in commons

- Added a dedicated Sync Storage service layer in `testit-js-commons`:
  - `src/services/syncstorage/syncstorage.runner.ts`
  - `src/services/syncstorage/syncstorage.type.ts`
  - `src/services/syncstorage/index.ts`
- Exported via `src/services/index.ts`.
- Integrated in `BaseStrategy` lifecycle:
  - `setup()`:
    - starts/connects Sync Storage
    - registers worker
    - sets worker status to `in_progress`
  - `loadTestRun()`:
    - sends in-progress cut result via Sync Storage (includes **`statusType`** on the cut model, consistent with final result mapping)
    - after successful Sync Storage publish: **`postInProgressAutotestResult`** — first TMS write with `statusType: "InProgress"`
    - then sends final results to Test IT (`loadAutotests`)
  - `teardown()`:
    - sets worker status to `completed`
    - executes `wait_completion` with `force_completion` fallback
    - completes test run in Test IT

### 2) Configuration and defaults

- Extended `AdapterConfig`:
  - `syncStorageEnabled?: boolean`
  - `syncStoragePort?: string`
- Added env support:
  - `TMS_SYNC_STORAGE_ENABLED`
  - `TMS_SYNC_STORAGE_PORT`
- Set defaults:
  - `syncStorageEnabled = true`
  - `syncStoragePort = "49152"`

### 3) Runner hardening

- Added HTTP timeout and retry behavior for Sync Storage API calls.
- Added safe response parsing (handles empty/non-JSON responses).
- Added GitHub release redirect handling during binary download.
- Added startup polling and warm-up delay.
- Kept compatibility fallback: `wait_completion` -> `force_completion`.

### 4) Adapter lifecycle alignment

To ensure Sync Storage logic actually runs everywhere, lifecycle gaps were fixed:

- **Playwright**
  - `setup()` called in `onBegin`
  - `teardown()` called in `onEnd`
  - fixed async race for skipped tests (`Promise.all` instead of `forEach(async ...)`)
- **Cucumber**
  - added setup promise during formatter init
  - waits setup completion before final run processing
- **TestCafe**
  - added setup at initialization
  - added teardown at run end
- **Mocha**
  - made setup blocking in run-begin handler
  - hardened teardown path with `deasync-promise` (guarded run end, errors caught) to avoid superagent double-callback issues on network failures

- **Jest**
  - `globalThis.strategy` from `globalSetup` reused in environment when in the same process; use `--runInBand` when a single shared `strategy` / Sync Storage registration is required
  - resilient attachment queue: failed uploads no longer reject `saveResult` / `loadResults` or lose remaining tests

### 5) Stability fixes related to reporting behavior

- Playwright step collection now uses full `TestResult.steps` tree and recursive conversion, so fixture hook steps are preserved.
- Playwright reporter catches attachment / per-test async failures so TLS resets do not crash the process with unhandled rejections.
- Namespace/classname update logic no longer corrupts existing hierarchy when metadata is missing in fixture-failure scenarios.
- `externalId` and `autoTestExternalId` are excluded from HTML escaping to prevent identifier distortion.

## Validation Performed

- `testit-js-commons`:
  - unit tests passed
  - build passed
- Adapters build verification passed:
  - Playwright
  - Cucumber
  - TestCafe reporter
  - Mocha
  - (also validated earlier: Jest, Cypress)

## Operational Notes

- Sync Storage is default-enabled but can be disabled:

```bash
TMS_SYNC_STORAGE_ENABLED=false
```

- Default port:

```bash
TMS_SYNC_STORAGE_PORT=49152
```

- If Sync Storage is unavailable, integration gracefully degrades without blocking standard Test IT result upload.

- **Jest + Sync Storage:** without `--runInBand` (or another single-worker setup), workers may not share the `globalSetup` strategy instance; plan CI accordingly.
