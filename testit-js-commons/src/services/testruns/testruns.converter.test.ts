import { AdapterConfig } from "../../common";
import { TestRunConverter } from "./testruns.converter";
import { AutotestResult } from "./testruns.type";

function makeConfig(): AdapterConfig {
  return {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
  };
}

describe("TestRunConverter.toOriginAutotestResultInProgress", () => {
  it("omits links/steps/attachments so final POST does not duplicate them", () => {
    const converter = new TestRunConverter(makeConfig());
    const model = converter.toOriginAutotestResultInProgress({
      autoTestExternalId: "ext-1",
      outcome: "Passed",
      links: [
        { url: "https://a.example", title: "A" },
        { url: "https://b.example", title: "B" },
      ],
      stepResults: [{ title: "step" }],
      attachments: [{ id: "att-1" }],
      message: "msg",
      startedOn: new Date("2026-01-01T00:00:00.000Z"),
    } as AutotestResult);

    expect(model.statusType).toBe("InProgress");
    expect(model.autoTestExternalId).toBe("ext-1");
    expect(model.links).toBeUndefined();
    expect(model.stepResults).toBeUndefined();
    expect(model.attachments).toBeUndefined();
    expect(model.message).toBeUndefined();
    expect(model.startedOn).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });
});

describe("TestRunConverter.toOriginSetupTeardownUpdate", () => {
  it("includes only setupResults and teardownResults", () => {
    const converter = new TestRunConverter(makeConfig());
    const model = converter.toOriginSetupTeardownUpdate({
      autoTestExternalId: "ext-1",
      outcome: "Passed",
      stepResults: [{ title: "test step" }],
      setupResults: [{ title: "setup" }],
      teardownResults: [{ title: "teardown" }],
      message: "ignored",
    } as AutotestResult);

    expect(model.setupResults).toHaveLength(1);
    expect(model.teardownResults).toHaveLength(1);
    expect(model.stepResults).toBeUndefined();
    expect(model.outcome).toBeUndefined();
    expect(model.message).toBeUndefined();
  });
});

describe("TestRunConverter.toOriginAutotestResult links", () => {
  it("keeps each addLinks type instead of collapsing to Related", () => {
    const converter = new TestRunConverter(makeConfig());
    const model = converter.toOriginAutotestResult({
      autoTestExternalId: "ext-1",
      outcome: "Passed",
      links: [
        { url: "https://test01.example", title: "Example01", type: "BlockedBy" },
        { url: "https://test02.example", title: "Example02", type: "Defect" },
        { url: "https://test03.example", title: "Example03", type: "Issue" },
        { url: "https://test04.example", title: "Example04", type: "Requirement" },
        { url: "https://test05.example", title: "Example05", type: "Repository" },
        { url: "https://test06.example", title: "Example06", type: "Related" },
      ],
    } as AutotestResult);

    expect(model.links.map((link: { type: string }) => link.type)).toEqual([
      "BlockedBy",
      "Defect",
      "Issue",
      "Requirement",
      "Repository",
      "Related",
    ]);
  });

  it("defaults link without type to Related", () => {
    const converter = new TestRunConverter(makeConfig());
    const model = converter.toOriginAutotestResult({
      autoTestExternalId: "ext-1",
      outcome: "Passed",
      links: [{ url: "https://test01.example", title: "Example01" }],
    } as AutotestResult);

    expect(model.links).toHaveLength(1);
    expect(model.links[0].type).toBe("Related");
  });
});
