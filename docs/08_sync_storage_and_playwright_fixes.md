# Sync Storage, TMS, and adapter stability

Technical reference for the `adapters-js` monorepo: Sync Storage in commons, TMS result flow, and adapter-specific behavior.

## 1. Commons: Sync Storage + `BaseStrategy`

- Code: `src/services/syncstorage/*`, wired in `base.strategy.ts`.
- Cut payload includes **`statusType`** (with `statusCode`), aligned with final result mapping (Succeeded / Failed / Incomplete).
- After **successful** master cut: `TestRunsService.postInProgressAutotestResult` (TMS `InProgress`), then `loadAutotests`.
- **`toOriginAutotestResultInProgress`** drops **`links`**: two `setAutoTestResultsForTestRun` calls in a row otherwise **merge** links server-side (symptom: expected 2, got 4).
- Runner: HTTP timeout/retry, GitHub binary (`SyncStorageRunner.VERSION`), `wait_completion` → `force_completion`.

## 2. Playwright

- Prefer `TestResult.steps` and recursive `test.step` extraction so fixture hooks contribute steps.
- New autotest: metadata `namespace`/`classname`, else path defaults; updates avoid forced path overwrite + commons merge on update.
- Attachment uploads: failures logged, no unhandled rejections.
- Metadata API: `testit.links` → autotest definition; `testit.addLinks` → **run result** (different payload fields).

## 3. Jest

- `globalSetup` sets `globalThis.strategy` after `setup()`; environment uses `globalThis.strategy ?? StrategyFactory.create(...)`.
- Attachment queue: per-promise `.catch` + `Promise.allSettled` before persisting / sending results.
- **Workers:** child processes do not share parent `globalThis` → use **`--runInBand`** (or single worker) if `globalSetup` must own the only `strategy`.

## 4. Mocha

- `catch` on `deasync-promise` `setup` / `teardown`; guarded `onEndRun` to reduce `superagent: double callback` on TLS/socket errors.

## 5. Other adapters

- Cucumber / TestCafe: await `setup` before final upload; teardown at end of run.

## 6. HTML escape (commons)

- Skip escaping for **`externalId`** and **`autoTestExternalId`** (`html-escape.util.ts`).

## 7. Maintenance

- Bump **`SyncStorageRunner.VERSION`** when changing the Sync Storage release.
- Prefer integrating new adapters through **`BaseStrategy`** only.
