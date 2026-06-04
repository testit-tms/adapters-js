import logger from "../../logger";

/** Node/network error codes that are safe to retry. */
const TRANSIENT_NETWORK_CODES = new Set([  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "ECONNABORTED",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

/** Windows errno for ECONNRESET. */
const ERRNO_ECONNRESET = -104;

export type HttpErrorLike = {
  code?: string;
  errno?: number;
  status?: number;
  statusCode?: number;
  response?: { status?: number };
  error?: unknown;
  cause?: unknown;
};

export type HttpRetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  /** When true, delay is `delayMs * attempt` (1-based). */
  backoff?: boolean;
  /** Shown in debug logs when a retry happens. */
  label?: string;
};
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isErrorLike(value: unknown): value is HttpErrorLike {
  return value !== null && typeof value === "object";
}

/** Unwrap nested `error` / `cause` from API client wrappers. */
export function unwrapHttpError(err: unknown): HttpErrorLike | null {
  if (!isErrorLike(err)) {
    return null;
  }
  const nested = err.error;
  if (isErrorLike(nested)) {
    return nested;
  }
  const cause = err.cause;
  if (isErrorLike(cause)) {
    return cause;
  }
  return err;
}

export function getHttpStatus(err: HttpErrorLike): number | undefined {
  const status = err.status ?? err.statusCode ?? err.response?.status;
  return typeof status === "number" ? status : undefined;
}

export function getNetworkErrorCode(err: HttpErrorLike): string | undefined {
  return typeof err.code === "string" ? err.code : undefined;
}

/**
 * Retry only transient failures: HTTP 5xx and known network error codes.
 * Does not retry HTTP 4xx (client/validation errors).
 */
export function isRetryableHttpError(err: unknown): boolean {
  const e = unwrapHttpError(err);
  if (!e) {
    return false;
  }

  const status = getHttpStatus(e);
  if (status !== undefined) {
    if (status >= 400 && status < 500) {
      return false;
    }
    if (status >= 500) {
      return true;
    }
  }

  const code = getNetworkErrorCode(e);
  if (code !== undefined && TRANSIENT_NETWORK_CODES.has(code)) {
    return true;
  }
  if (e.errno === ERRNO_ECONNRESET) {
    return true;
  }

  return false;
}

export async function withHttpRetry<T>(fn: () => Promise<T>, options: HttpRetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const backoff = options.backoff ?? false;
  const label = options.label ?? "http";

  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      if (attempt > 1) {
        logger.debug(`[http-retry] ${label} succeeded on attempt ${attempt}/${maxAttempts}`);
      }
      return value;
    } catch (e) {
      last = e;
      if (!isRetryableHttpError(e) || attempt === maxAttempts) {
        if (attempt > 1) {
          logger.debug(`[http-retry] ${label} failed after ${attempt} attempt(s)`, {
            retryable: isRetryableHttpError(e),
          });
        }
        throw e;
      }
      const waitMs = backoff ? delayMs * attempt : delayMs;
      logger.debug(`[http-retry] ${label} attempt ${attempt}/${maxAttempts} failed, retry in ${waitMs}ms`, {
        status: getHttpStatus(unwrapHttpError(e) ?? {}),
        code: getNetworkErrorCode(unwrapHttpError(e) ?? {}),
      });
      await sleep(waitMs);
    }
  }
  throw last;
}