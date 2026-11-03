import { parseTags } from "./utils";

describe("parseTags layer", () => {
  it("parses @Layer=API tag", () => {
    const parsed = parseTags([{ name: "@Layer=API" }]);
    expect(parsed.layer).toBe("API");
  });

  it("omits layer when tag absent", () => {
    const parsed = parseTags([{ name: "@Labels=smoke" }]);
    expect(parsed.layer).toBeUndefined();
  });

  it("accepts custom layer string", () => {
    const parsed = parseTags([{ name: "@Layer=my-custom-layer" }]);
    expect(parsed.layer).toBe("my-custom-layer");
  });
});
