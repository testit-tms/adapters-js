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
