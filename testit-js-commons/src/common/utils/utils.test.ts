import { Utils } from "./utils";

describe("Utils.toPosixPath", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(Utils.toPosixPath("api\\users\\v1")).toBe("api/users/v1");
  });

  it("keeps forward slashes", () => {
    expect(Utils.toPosixPath("api/users/v1")).toBe("api/users/v1");
  });
});

describe("Utils.getDir", () => {
  it("returns directory with posix separators", () => {
    expect(Utils.getDir("api\\users\\test.spec.ts")).toBe("api/users");
    expect(Utils.getDir("api/users/test.spec.ts")).toBe("api/users");
  });
});
