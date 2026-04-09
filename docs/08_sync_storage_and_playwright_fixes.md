# Sync Storage, TMS, and adapter stability

Technical reference for the `adapters-js` monorepo: Sync Storage in commons, TMS result flow, and adapter-specific behavior.

## 1. Commons: Sync Storage + `BaseStrategy`

- Code: `src/services/syncstorage/*`, wired in `base.strategy.ts`.
- Cut payload includes **`statusType`** (with `statusCode`), aligned with final result mapping (Succeeded / Failed / Incomplete).
- **`loadTestRun`**: for **each** autotest in the batch — `postInProgressAutotestResult` then `loadAutotests([that one])` (Jest one batch of N tests → N InProgress + N finals; Playwright one test → unchanged). Sync Storage cut still **once**, first test only.
- **InProgress TMS payload is minimal** (`configurationId`, `autoTestExternalId`, `statusType: "InProgress"`, `statusCode: null`, optional `startedOn` only): no steps, attachments, duration, or `completedOn` — some TMS versions infer “finished” if those are present. **`links`** omitted on the stub (final POST merges links; avoids doubling).
- **Debug:** set env **`TMS_DEBUG_LOAD_TEST_RUN=1`** (or `true`) to log order of `setAutoTestResultsForTestRun` calls (`[testit-js-commons:loadTestRun] …`).
- Runner: HTTP timeout/retry, GitHub binary (`SyncStorageRunner.VERSION`), `wait_completion` → `force_completion`.

## 2. Commons: TMS attachment uploads (`attachments.service.ts`)

- **Retries:** up to **3** attempts, linear backoff (base **500 ms** × attempt) on transient errors (`ECONNRESET`, `ETIMEDOUT`, `EPIPE`, `ECONNABORTED`, typical TLS/socket messages, **5xx**). **No retry** on **4xx**.
- Each attempt uses a **new** read stream (file paths and text-via-temp-file uploads are safe to repeat).
- **HTTP timeout** for the attachments API client: at least **120 s** (reduces premature cuts on slow TLS/large files).

## 3. Playwright

- Prefer `TestResult.steps` and recursive `test.step` extraction so fixture hooks contribute steps.
- New autotest: metadata `namespace`/`classname`, else path defaults; updates avoid forced path overwrite + commons merge on update.
- Reporter still **catches** upload failures so the run does not crash; commons retries run **before** that layer gives up.
- Metadata API: `testit.links` → autotest definition; `testit.addLinks` → **run result** (different payload fields).

## 4. Jest

- `globalSetup` sets `globalThis.strategy` after `setup()`; environment uses `globalThis.strategy ?? StrategyFactory.create(...)`.
- Attachment queue: per-promise `.catch` + `Promise.allSettled` before persisting / sending results (after commons retries exhaust).
- **Workers:** child processes do not share parent `globalThis` → use **`--runInBand`** (or single worker) if `globalSetup` must own the only `strategy`.

## 5. Mocha

- `catch` on `deasync-promise` `setup` / `teardown`; guarded `onEndRun` to reduce `superagent: double callback` on TLS/socket errors.

## 6. Other adapters

- Cucumber / TestCafe: await `setup` before final upload; teardown at end of run.

## 7. HTML escape (commons)

- Skip escaping for **`externalId`** and **`autoTestExternalId`** (`html-escape.util.ts`).

## 8. Maintenance

- Bump **`SyncStorageRunner.VERSION`** when changing the Sync Storage release.
- Prefer integrating new adapters through **`BaseStrategy`** only.
