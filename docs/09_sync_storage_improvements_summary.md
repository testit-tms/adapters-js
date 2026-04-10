# At a glance: Sync Storage + adapter changes

| Topic | What changed |
|--------|----------------|
| First-result InProgress | Only first result is sync candidate; TMS `InProgress` is posted only by sync master when cut publish succeeded. |
| InProgress race fix | Added in-flight publish guard (`publishingInFlight`) so concurrent calls cannot create multiple first `InProgress` cuts. |
| Non-master behavior | If worker is not master (or cut not published), adapter skips `InProgress` stub and sends finals as usual. |
| Run completion | With active sync-storage, adapter teardown skips `completeTestRun`; sync-storage completes run lifecycle. |
| Jest lifecycle | `globalSetup` does not run setup; each worker runs local setup and guaranteed teardown in `run_finish` finally. |
| Jest stability | Early `unhandledRejection` handlers + guarded async paths to prevent process crash. |
| Sync logs | Added detailed sync skip/publish reason logs (`notMaster`, `alreadyInProgress`, `publishingInFlight`, incomplete payload) + explicit slot-acquired marker. |
| Debug flag | `TMS_DEBUG_LOAD_TEST_RUN=1` enables ordered load-test-run logs in commons. |
| Attachments | Commons retries uploads (3x) with backoff and 120s timeout for transient network/server errors. |
| Final results resilience | Each final result POST in `loadAutotests()` retries on transient failures; after max retries logs error and continues with next result. |
| Commons misc | `externalId` and `autoTestExternalId` are excluded from HTML escaping. |

Disable sync-storage explicitly: `TMS_SYNC_STORAGE_ENABLED=false`.

Full detail: [`08_sync_storage_and_playwright_fixes.md`](./08_sync_storage_and_playwright_fixes.md).
