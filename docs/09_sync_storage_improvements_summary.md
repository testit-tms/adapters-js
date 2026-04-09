# At a glance: Sync Storage + adapter changes

| Topic | What changed |
|--------|----------------|
| Sync Storage | Default on; cut includes `statusType`; master posts TMS **InProgress**, then final results. |
| Duplicate TMS links | InProgress model has **no `links`** — avoids merge doubling on the second POST. |
| TMS attachments | **Retries** (3×, backoff) + **≥120 s** HTTP timeout in `attachments.service.ts` for transient errors (`ECONNRESET`, 5xx, …). |
| Jest | `globalThis.strategy`; `.catch` / `allSettled` on queue; use **`--runInBand`** for one shared strategy. |
| Playwright | Full step tree, namespace/classname rules; reporter still catches failures after commons retries. |
| Mocha | `catch` around sync `setup`/`teardown`. |
| Commons | No HTML escape on `externalId` / `autoTestExternalId`. |

Disable Sync Storage: `TMS_SYNC_STORAGE_ENABLED=false`.

Full detail: [`08_sync_storage_and_playwright_fixes.md`](./08_sync_storage_and_playwright_fixes.md).
