# At a glance: Sync Storage + adapter changes

| Topic | What changed |
|--------|----------------|
| Sync Storage + TMS | Cut once (master, first test); **each** autotest: TMS **InProgress** then final `loadAutotests` for that row (fixes Jest single batch of N). |
| InProgress TMS payload | **Minimal** (no steps/attachments/duration/completedOn); no **`links`** on stub (merge-safe). |
| Debug loadTestRun | Env **`TMS_DEBUG_LOAD_TEST_RUN=1`** → `[testit-js-commons:loadTestRun]` logs. |
| TMS attachments | **Retries** (3×, backoff) + **≥120 s** HTTP timeout in `attachments.service.ts` for transient errors (`ECONNRESET`, 5xx, …). |
| Jest | `globalThis.strategy`; `.catch` / `allSettled` on queue; use **`--runInBand`** for one shared strategy. |
| Playwright | Full step tree, namespace/classname rules; reporter still catches failures after commons retries. |
| Mocha | `catch` around sync `setup`/`teardown`. |
| Commons | No HTML escape on `externalId` / `autoTestExternalId`. |

Disable Sync Storage: `TMS_SYNC_STORAGE_ENABLED=false`.

Full detail: [`08_sync_storage_and_playwright_fixes.md`](./08_sync_storage_and_playwright_fixes.md).
