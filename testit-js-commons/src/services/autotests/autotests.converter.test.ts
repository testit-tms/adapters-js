import { AdapterConfig } from "../../common";
import { AutotestConverter } from "./autotests.converter";
import { AutotestPost } from "./autotests.type";

function makeConfig(): AdapterConfig {
  return {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
  };
}

function makeAutotest(overrides: Partial<AutotestPost> = {}): AutotestPost {
  return {
    externalId: "ext-1",
    name: "test name",
    ...overrides,
  };
}

describe("AutotestConverter layer", () => {
  const converter = new AutotestConverter(makeConfig());

  it("create: includes layer when set", () => {
    const model = converter.toOriginAutotestCreate(makeAutotest({ layer: "API" }));
    expect(model.layer).toEqual({ name: "API", source: "Run" });
    expect(model.resetLayer).toBeUndefined();
  });

  it("create: omits layer when not set", () => {
    const model = converter.toOriginAutotestCreate(makeAutotest());
    expect(model.layer).toBeUndefined();
  });

  it("create: accepts custom layer string", () => {
    const model = converter.toOriginAutotestCreate(makeAutotest({ layer: "my-custom-layer" }));
    expect(model.layer).toEqual({ name: "my-custom-layer", source: "Run" });
  });

  it("update: always resetLayer false, layer only when set", () => {
    const withLayer = converter.toOriginAutotestUpdate(makeAutotest({ layer: "E2E" }));
    expect(withLayer.resetLayer).toBe(false);
    expect(withLayer.layer).toEqual({ name: "E2E", source: "Run" });

    const withoutLayer = converter.toOriginAutotestUpdate(makeAutotest());
    expect(withoutLayer.resetLayer).toBe(false);
    expect(withoutLayer.layer).toBeUndefined();
  });
});
