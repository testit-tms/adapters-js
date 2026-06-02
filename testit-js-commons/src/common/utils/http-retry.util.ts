/** Node/network error codes that are safe to retry. */
const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
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

  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRetryableHttpError(e) || attempt === maxAttempts) {
        throw e;
      }
      await sleep(backoff ? delayMs * attempt : delayMs);
    }
  }
  throw last;
}
