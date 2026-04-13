# Attachment upload resilience and Cucumber formatter

Summary of recent changes: fewer CI flakes from network failures (`ECONNRESET`, `socket hang up`, slow TLS) and fewer unhandled promise rejections at the end of a Cucumber run.

## `testit-js-commons`: attachments service

File: `testit-js-commons/src/services/attachments/attachments.service.ts`.

| Change | Why |
|--------|-----|
| Up to **5** attempts per HTTP upload (`UPLOAD_MAX_ATTEMPTS`) | Retry on connection drops and other transient errors. |
| Exponential backoff (`UPLOAD_RETRY_BASE_MS * attempt`) | Avoid hammering the API right after a failure. |
| Minimum client timeout **120 s** (`UPLOAD_CLIENT_TIMEOUT_MS`) | Fewer false timeouts on slow TLS or proxies. |
| **Sequential** upload for an array of file paths | Parallel streams increased the chance of `ECONNRESET` under load. |
| `unwrapAttachmentError` + broader `isTransientAttachmentError` | Handles nested `error`/`cause`, `errno: -104`, and `read ECONNRESET` in `message`. |
| `withUploadRetry` for `uploadTextAttachment` and `uploadAttachments` | Same retry policy for text and file attachments. |

**4xx** responses are not retried; **5xx** are treated as transient.

## `testit-adapter-cucumber`: formatter

File: `testit-adapter-cucumber/src/formatter.ts`.

| Change | Why |
|--------|-----|
| Up to **3** attempts for `additions.addAttachments(attachments)` with `400 * attempt` ms delay | Extra layer on top of commons: retry the whole path batch on a temporary API failure. |
| Attachment queue: `Promise.allSettled` instead of `Promise.all` | One failed batch does not cancel waiting for the rest. |
| `loadAutotest`: `.catch` per call + `Promise.allSettled` over the list | Log errors without surfacing rejections. |
| `loadTestRun` and `teardown`: separate `.catch` handlers | Run completion does not fail on a single network error. |
| `onTestRunFinished` wrapped in `try/catch` | Guard against synchronous or unexpected errors. |
| `envelope` handler: `void handleEnvelope(...).catch(...)` | Async errors in the message pipeline are not left dangling. |
| Global `unhandledRejection` (installed once) | Diagnostics if something still slips through. |

**Summary:** **commons** owns per-file retries and upload ordering; **cucumber** retries the **full path set** and keeps the final phase from killing the process on a single rejected promise.

## Related docs

- Sync storage and adapters: [`08_sync_storage_and_playwright_fixes.md`](./08_sync_storage_and_playwright_fixes.md), [`09_sync_storage_improvements_summary.md`](./09_sync_storage_improvements_summary.md).
- `in_progress_published` barrier: [`10_inprogress_published_barrier.md`](./10_inprogress_published_barrier.md).

## If CI still shows zero attachments

1. Check logs: cucumber `(gave up)` and commons `Error uploading attachment` — confirm whether all retries were exhausted.
2. If infrastructure drops connections consistently, review proxy/API timeouts and limits, not only retry counts.
