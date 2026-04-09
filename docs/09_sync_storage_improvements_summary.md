# At a glance: Sync Storage + adapter changes

| Topic | What changed |
|--------|----------------|
| Sync Storage | Default on; cut includes `statusType`; master posts TMS **InProgress**, then final results. |
| Duplicate TMS links | InProgress model has **no `links`** — avoids merge doubling on the second POST. |
| Jest | `globalThis.strategy`; resilient attachments; use **`--runInBand`** for one shared strategy. |
| Playwright | Full step tree, namespace/classname rules, attachment errors contained. |
| Mocha | `catch` around sync `setup`/`teardown`. |
| Commons | No HTML escape on `externalId` / `autoTestExternalId`. |

Disable Sync Storage: `TMS_SYNC_STORAGE_ENABLED=false`.

Full detail: [`08_sync_storage_and_playwright_fixes.md`](./08_sync_storage_and_playwright_fixes.md).
