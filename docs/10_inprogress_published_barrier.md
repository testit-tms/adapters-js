# InProgress Published Barrier

This document describes the cross-worker ordering mechanism that ensures `InProgress` is posted before non-master workers start uploading final results.

## Why this exists

In multi-worker runs (for example Jest), workers are separate processes and do not share memory. Without coordination, a non-master worker can upload final results before master publishes the single `InProgress` record.

## Core idea

Sync Storage provides a shared state endpoint:

- `GET /in_progress_published?testRunId=...`

It returns:

- `published: true` when master has already published the `InProgress` cut.

Non-master workers use this state as a barrier before final uploads.

## Flow

1. Master calls `sendInProgressTestResult(...)`.
2. After successful publish, sync-storage marks `published=true`.
3. Non-master workers call `waitForInProgressPublished(timeoutMs)` before uploading finals.
4. If `published=true` is observed, finals continue immediately.
5. If timeout is reached, finals continue anyway (best-effort behavior, no deadlock).

## Implementation points

- `src/services/syncstorage/syncstorage.runner.ts`
  - `waitForInProgressPublished(timeoutMs)` polls `inProgressPublishedGet`.
  - Poll interval: `200ms`.
  - Also updates local `alreadyInProgress=true` after positive response.
- `src/strategy/base.strategy.ts`
  - In non-master path, waits on the barrier before `loadAutotests(...)`.

## Configuration

- `TMS_SYNC_INPROGRESS_FIRST_GRACE_MS`
  - Now used as **barrier wait timeout** (milliseconds), not a blind sleep.
  - Default: `3000`.
  - `0` disables waiting.

## Logging to watch

- `[testit-js-commons:loadTestRun] non-master wait for in-progress published`
- `[testit-js-commons:loadTestRun] non-master wait result`
- `[testit-js-commons:loadTestRun] InProgress slot acquired`
- `[syncstorage] alreadyInProgress set`

## Guarantees and limits

- Stronger ordering than time-based delay, because workers wait on shared sync-storage state.
- Still best-effort with timeout to avoid blocking a run forever if sync-storage is temporarily unavailable.
