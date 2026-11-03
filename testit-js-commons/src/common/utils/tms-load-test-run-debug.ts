/** Trace loadTestRun / result POST with `LOG_LEVEL=debug` or `TMS_DEBUG_LOAD_TEST_RUN=1`. */
import logger from "../../logger";

export function isTmsLoadTestRunDebug(): boolean {
  if (logger.isLevelEnabled("debug")) {
    return true;
  }
  const v = process.env.TMS_DEBUG_LOAD_TEST_RUN;
  return v === "1" || v?.toLowerCase() === "true";
}

/** Trace sync-storage adapter calls only when `TMS_DEBUG_SYNC_STORAGE=1` (not plain LOG_LEVEL=debug). */
export function isSyncStorageDebug(): boolean {
  const v = process.env.TMS_DEBUG_SYNC_STORAGE;
  return v === "1" || v?.toLowerCase() === "true";
}

export function logTmsLoadTestRun(message: string, data?: Record<string, unknown>): void {
  if (!isTmsLoadTestRunDebug()) {
    return;
  }
  if (data && Object.keys(data).length > 0) {
    logger.debug(`[loadTestRun] ${message}`, data);
  } else {
    logger.debug(`[loadTestRun] ${message}`);
  }
}
