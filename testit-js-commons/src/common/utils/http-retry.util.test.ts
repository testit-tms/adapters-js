import { getHttpStatus, getNetworkErrorCode, isRetryableHttpError } from "./http-retry.util";

describe("isRetryableHttpError", () => {
  it("retries on network error code", () => {
    expect(isRetryableHttpError({ code: "ECONNRESET" })).toBe(true);
    expect(getNetworkErrorCode({ code: "ECONNRESET" })).toBe("ECONNRESET");
  });

  it("retries on HTTP 5xx", () => {
    expect(isRetryableHttpError({ status: 503 })).toBe(true);
    expect(getHttpStatus({ response: { status: 502 } })).toBe(502);
  });

  it("does not retry HTTP 4xx", () => {
    expect(isRetryableHttpError({ status: 400 })).toBe(false);
    expect(isRetryableHttpError({ statusCode: 404 })).toBe(false);
  });

  it("unwraps nested error", () => {
    expect(isRetryableHttpError({ error: { code: "ETIMEDOUT" } })).toBe(true);
  });

  it("does not retry unknown errors without status/code", () => {
    expect(isRetryableHttpError(new Error("something went wrong"))).toBe(false);
  });
});
