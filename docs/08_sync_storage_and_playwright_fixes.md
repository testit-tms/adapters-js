# Sync Storage Integration and Playwright Stability Fixes

This document describes the key changes made in `adapters-js` for:

- default Sync Storage workflow in `testit-js-commons`
- Playwright step rendering from fixtures/hooks
- safe namespace/classname updates when tests fail in fixtures
- `externalId` / `autoTestExternalId` escaping behavior

The goal is to preserve backward compatibility for existing adapters while making distributed/realtime reporting more robust.

## 1) Sync Storage in `testit-js-commons` (now default)

### What was added

- New service module:
  - `testit-js-commons/src/services/syncstorage/syncstorage.runner.ts`
  - `testit-js-commons/src/services/syncstorage/syncstorage.type.ts`
  - `testit-js-commons/src/services/syncstorage/index.ts`
- Export wired in:
  - `testit-js-commons/src/services/index.ts`
- Integration point:
  - `testit-js-commons/src/strategy/base.strategy.ts`

### Runtime behavior

`BaseStrategy` now orchestrates Sync Storage lifecycle:

- `setup()`:
  - starts or connects to Sync Storage
  - registers worker
  - sets worker status to `in_progress`
  - starts test run in Test IT
- `loadTestRun()`:
  - sends one in-progress cut result (`/in_progress_test_result`) from master worker
  - then sends normal results to Test IT as before
- `teardown()`:
  - sets worker status to `completed`
  - tries `/wait_completion`, falls back to `/force_completion`
  - completes test run in Test IT

### Process management

`SyncStorageRunner` now supports:

- health check for external service (`/health`)
- local process auto-start if service is not running
- binary download from GitHub Releases (`v0.1.18`) to `build/.caches`
- OS/arch-aware executable selection:
  - OS: `windows`, `linux`, `darwin`
  - Arch: `amd64`, `arm64`

### Configuration

Added to `AdapterConfig`:

- `syncStorageEnabled?: boolean`
- `syncStoragePort?: string`

Added env variables:

- `TMS_SYNC_STORAGE_ENABLED`
- `TMS_SYNC_STORAGE_PORT`

Default values:

- `syncStorageEnabled = true`
- `syncStoragePort = "49152"`

To disable Sync Storage explicitly:

```bash
TMS_SYNC_STORAGE_ENABLED=false
```

## 2) Playwright: steps from fixtures/hooks are now included

### Problem

Steps from fixture wrappers (`Before Hooks` / `After Hooks`) were missed because top-level caching in reporter filtered out nested steps by `step.parent`.

### Fix

- `testit-adapter-playwright/src/reporter.ts` now prefers `TestResult.steps` (full Playwright step tree) in `onTestEnd`.
- `testit-adapter-playwright/src/models/result.ts` now carries `steps?: TestStep[]`.
- `testit-adapter-playwright/src/converter.ts` recursively traverses non-`test.step` wrappers and extracts nested `test.step` nodes.

Result: user-defined `testit.step(...)` in fixture flow is rendered in Test IT.

## 3) Playwright: safe namespace/classname behavior on fixture failures

### Problem

If a test failed before metadata calls were executed, reporter could fall back to file path namespace/classname and overwrite existing Test IT tree during updates.

### Fix

In `testit-adapter-playwright/src/reporter.ts`:

- on **new autotest creation**:
  - use `testit.namespace` / `testit.classname` from metadata if present
  - use path-based defaults only when metadata values are missing
- on **existing autotest update**:
  - do not force path fallback
  - let commons merge logic preserve existing tree if no explicit values were sent

In `testit-js-commons/src/services/autotests/autotests.service.ts`:

- added merge before update:
  - `namespace = incoming ?? origin.namespace`
  - `classname = incoming ?? origin.classname`

This prevents accidental tree corruption when failures happen in hooks/fixtures.

## 4) `externalId` / `autoTestExternalId` are not escaped

### Problem

Escaping logic in commons could alter `<` / `>` in identifiers, creating duplicates and wrong mapping.

### Fix

`testit-js-commons/src/common/utils/html-escape.util.ts` now skips HTML escaping for keys:

- `externalId`
- `autoTestExternalId`

All other string fields keep existing escape behavior.

## 5) Tests and verification

Added tests:

- `testit-js-commons/src/services/syncstorage/syncstorage.runner.test.ts`
- `testit-js-commons/src/helpers/config/config.helper.test.ts`
- updated html escaping tests for identifier behavior

Validated by:

- `npm test` in `testit-js-commons`
- `npm run build` in:
  - `testit-js-commons`
  - `testit-adapter-playwright`
  - `testit-adapter-jest`
  - `testit-adapter-mocha`
  - `testit-adapter-cypress`

## 6) Operational notes for future maintenance

- Keep Sync Storage optional at runtime via env override, even if enabled by default.
- If Sync Storage binary release version changes, update it in `SyncStorageRunner.VERSION`.
- Do not bypass metadata precedence for Playwright namespace/classname.
- Keep merge-on-update in commons for `namespace`/`classname` to avoid test tree regressions on partial metadata runs.
- For new adapters, prefer integrating through `BaseStrategy` only (single shared behavior point).
