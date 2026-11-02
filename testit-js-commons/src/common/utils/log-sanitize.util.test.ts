import { formatLogError, redactSecrets, redactSecretsInString } from "./log-sanitize.util";

describe("log-sanitize", () => {
  const token = "AvG6M3Vnc5SDZ0t4VlY0HqTG";
  const header =
    "GET /api/v2/testRuns/7526aece-b91d-479a-98e2-2ced1c2a513c HTTP/1.1\r\n" +
    `Authorization: PrivateToken ${token}\r\n` +
    "Accept: application/json\r\n";

  it("redacts Authorization PrivateToken in strings", () => {
    const out = redactSecretsInString(header);
    expect(out).not.toContain(token);
    expect(out).toContain("PrivateToken *****");
  });

  it("formatLogError drops req/_header and keeps status/body", () => {
    const err = {
      statusCode: 404,
      message: "Not Found",
      body: { error: { message: "Test run not found" } },
      response: {
        status: 404,
        req: { _header: header },
      },
      req: { _header: header },
    };

    const safe = formatLogError(err) as Record<string, unknown>;
    expect(JSON.stringify(safe)).not.toContain(token);
    expect(safe).not.toHaveProperty("req");
    expect(safe).not.toHaveProperty("response");
    expect(safe.status).toBe(404);
    expect(safe.message).toBe("Not Found");
  });

  it("redactSecrets sanitizes nested error objects used by logger", () => {
    const err = {
      response: { req: { _header: header }, status: 401 },
      statusCode: 401,
      message: `Unauthorized PrivateToken ${token}`,
    };
    const out = JSON.stringify(redactSecrets(err));
    expect(out).not.toContain(token);
    expect(out).toContain("*****");
  });

  it("formatLogError prefers body/error without headers", () => {
    const err = {
      error: {
        statusCode: 401,
        body: { title: "Unauthorized" },
        response: { req: { _header: header } },
      },
    };
    const safe = formatLogError(err) as Record<string, unknown>;
    expect(JSON.stringify(safe)).not.toContain(token);
    expect(safe.status).toBe(401);
    expect(safe.body).toEqual({ title: "Unauthorized" });
  });
});
