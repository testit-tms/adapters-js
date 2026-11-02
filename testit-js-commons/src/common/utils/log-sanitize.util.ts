const AUTH_HEADER_RE =
  /(Authorization\s*[:=]\s*)(["']?)(PrivateToken|Bearer)\s+\S+/gi;
const PRIVATE_TOKEN_RE = /(PrivateToken)\s+\S+/gi;
const SENSITIVE_KEYS = new Set([
  "authorization",
  "privatetoken",
  "private_token",
  "apitoken",
  "api_token",
  "token",
]);

const REDACTED = "*****";

/** Redact Authorization / PrivateToken values from a string. */
export function redactSecretsInString(value: string): string {
  return value
    .replace(AUTH_HEADER_RE, `$1$2$3 ${REDACTED}`)
    .replace(PRIVATE_TOKEN_RE, `$1 ${REDACTED}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-redact secrets from any value before logging.
 * Keeps structure; replaces sensitive header/token fields and string matches.
 */
export function redactSecrets(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value == null || depth > 8) {
    return value;
  }
  if (typeof value === "string") {
    return redactSecretsInString(value);
  }
  if (typeof value !== "object") {
    return value;
  }
  if (seen.has(value as object)) {
    return "[Circular]";
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1, seen));
  }

  // Prefer a safe HTTP-error shape when request/response with headers is present.
  const err = value as Record<string, unknown>;
  if (err.response != null || err.req != null || typeof err.statusCode === "number") {
    return formatLogError(value);
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(err)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    // Drop raw request objects that carry headers.
    if (key === "req" || key === "request") {
      continue;
    }
    out[key] = redactSecrets(nested, depth + 1, seen);
  }
  return out;
}

/**
 * Compact, header-free error summary for logs.
 * Prefer body / error / message — never dump req._header.
 */
export function formatLogError(err: unknown): Record<string, unknown> | string {
  if (err == null) {
    return String(err);
  }
  if (typeof err === "string") {
    return redactSecretsInString(err);
  }
  if (typeof err !== "object") {
    return String(err);
  }

  const e = err as Record<string, unknown>;
  const nested =
    (isPlainObject(e.error) ? e.error : null) ??
    (isPlainObject(e.cause) ? e.cause : null) ??
    e;
  const response = isPlainObject(nested.response) ? nested.response : undefined;
  const status =
    nested.statusCode ??
    nested.status ??
    response?.status ??
    response?.statusCode;

  const body = nested.body ?? response?.body ?? response?.text;
  const message =
    (typeof nested.message === "string" && nested.message) ||
    (typeof e.message === "string" && e.message) ||
    undefined;
  const code = nested.code ?? e.code;

  const safe: Record<string, unknown> = {};
  if (status != null) {
    safe.status = status;
  }
  if (code != null) {
    safe.code = code;
  }
  if (message) {
    safe.message = redactSecretsInString(message);
  }
  if (body != null) {
    safe.body = typeof body === "string" ? redactSecretsInString(body) : redactSecrets(body);
  }
  if (Object.keys(safe).length === 0) {
    try {
      return redactSecretsInString(JSON.stringify(err));
    } catch {
      return redactSecretsInString(String(err));
    }
  }
  return safe;
}
