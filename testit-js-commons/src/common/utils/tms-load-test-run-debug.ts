/** Set `TMS_DEBUG_LOAD_TEST_RUN=1` (or `true`) for loadTestRun / TMS result POST tracing. */

export function isTmsLoadTestRunDebug(): boolean {
  const v = process.env.TMS_DEBUG_LOAD_TEST_RUN;
  return v === "1" || v?.toLowerCase() === "true";
}

export function logTmsLoadTestRun(message: string, data?: Record<string, unknown>): void {
  if (!isTmsLoadTestRunDebug()) {
    return;
  }
  if (data && Object.keys(data).length > 0) {
    console.log(`[testit-js-commons:loadTestRun] ${message}`, data);
  } else {
    console.log(`[testit-js-commons:loadTestRun] ${message}`);
  }
}
