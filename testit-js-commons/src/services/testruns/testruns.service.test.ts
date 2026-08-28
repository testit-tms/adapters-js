import { AdapterConfig } from "../../common";
import { TestRunsService } from "./testruns.service";
import { AutotestResult } from "./testruns.type";

jest.mock("../../adapters-api/dist/index", () => ({
  ApiClient: {
    instance: {
      basePath: "",
      authentications: {
        PrivateToken: { apiKeyPrefix: "", apiKey: "" },
      },
    },
  },
  TestRunsApi: jest.fn().mockImplementation(() => ({
    adaptersTestRunsIdTestResultsPost: jest.fn().mockResolvedValue(["result-id-1"]),
  })),
}));

jest.mock("../testresults/testresults.service", () => ({
  TestResultsService: jest.fn().mockImplementation(() => ({
    findTestResultIdByExternalId: jest.fn().mockResolvedValue("existing-inprogress-id"),
    updateTestResult: jest.fn().mockResolvedValue(undefined),
  })),
}));

function makeConfig(): AdapterConfig {
  return {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
  };
}

function makeResult(overrides: Partial<AutotestResult> = {}): AutotestResult {
  return {
    autoTestExternalId: "ext-1",
    outcome: "Passed",
    stepResults: [{ title: "step-1" }],
    ...overrides,
  };
}

describe("TestRunsService.loadAutotests", () => {
  it("always POST final result even when in-progress id exists in cache", async () => {
    const service = new TestRunsService(makeConfig());
    const internal = service as any;
    internal.testResultIdsByExternalId.set("ext-1", "existing-inprogress-id");

    await service.loadAutotests("run-1", [makeResult()]);

    expect(internal._client.adaptersTestRunsIdTestResultsPost).toHaveBeenCalledTimes(1);
    expect(internal._testResults.updateTestResult).not.toHaveBeenCalled();
    expect(internal.finalizedExternalIds.has("ext-1")).toBe(true);
  });

  it("skips duplicate POST for already finalized externalId", async () => {
    const service = new TestRunsService(makeConfig());
    const internal = service as any;
    internal.finalizedExternalIds.add("ext-1");

    await service.loadAutotests("run-1", [makeResult()]);

    expect(internal._client.adaptersTestRunsIdTestResultsPost).not.toHaveBeenCalled();
  });
});

describe("TestRunsService.updateSetupTeardown", () => {
  it("PUT only setup/teardown fields", async () => {
    const service = new TestRunsService(makeConfig());
    const internal = service as any;
    internal.testResultIdsByExternalId.set("ext-1", "result-id-1");

    await service.updateSetupTeardown([
      makeResult({
        setupResults: [{ title: "beforeAll" }],
        teardownResults: [{ title: "afterAll" }],
        stepResults: [{ title: "must-not-put" }],
      }),
    ]);

    expect(internal._testResults.updateTestResult).toHaveBeenCalledWith(
      "result-id-1",
      expect.objectContaining({
        setupResults: expect.any(Array),
        teardownResults: expect.any(Array),
      }),
    );
    const putBody = internal._testResults.updateTestResult.mock.calls[0][1];
    expect(putBody.stepResults).toBeUndefined();
    expect(putBody.outcome).toBeUndefined();
    expect(putBody.statusType).toBeUndefined();
  });
});
