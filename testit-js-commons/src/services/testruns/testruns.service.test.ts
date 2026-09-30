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
      callApi: jest.fn(),
    },
  },
  TestRunsApi: jest.fn().mockImplementation(() => ({
    adaptersTestRunsIdTestResultsPost: jest.fn().mockResolvedValue(["result-id-1"]),
  })),
  TestRunState: {
    NotStarted: "NotStarted",
    InProgress: "InProgress",
    Stopped: "Stopped",
    Completed: "Completed",
  },
}));

jest.mock("../testresults/testresults.service", () => ({
  TestResultsService: jest.fn().mockImplementation(() => ({
    findTestResultIdByExternalId: jest.fn().mockResolvedValue("existing-inprogress-id"),
    updateTestResult: jest.fn().mockResolvedValue(undefined),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../../adapters-api/dist/index");
const callApi = AdaptersApi.ApiClient.instance.callApi as jest.Mock;

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

describe("TestRunsService.getTestRun", () => {
  beforeEach(() => {
    callApi.mockReset();
  });

  it("reads metadata via public API v2 (links/attachments/description/launchSource)", async () => {
    callApi.mockResolvedValue({
      data: {
        id: "run-1",
        name: "run",
        description: "213123123",
        launchSource: "Test IT",
        stateName: "Completed",
        status: { code: "PASSED", type: "Succeeded" },
        testResults: [{ id: "ignored" }],
        attachments: [{ id: "att-1" }],
        links: [{ url: "https://example.com/1", title: "one", hasInfo: true }],
        tags: ["a"],
      },
    });

    const service = new TestRunsService(makeConfig());
    const run = await service.getTestRun("run-1");

    expect(callApi).toHaveBeenCalledWith(
      "/api/v2/testRuns/{id}",
      "GET",
      { id: "run-1" },
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      null,
      ["PrivateToken"],
      expect.any(Array),
      expect.any(Array),
      Object,
      null
    );
    expect(run.description).toBe("213123123");
    expect(run.launchSource).toBe("Test IT");
    expect(run.stateName).toBe("Completed");
    expect(run.links).toEqual([
      expect.objectContaining({ url: "https://example.com/1", title: "one" }),
    ]);
    expect(run.attachments).toEqual([{ id: "att-1" }]);
    expect(run.tags).toEqual(["a"]);
    expect(run).not.toHaveProperty("testResults");
  });
});

describe("TestRunsService.loadAutotests", () => {
  it("always POST final result even when in-progress id exists in cache", async () => {
    const service = new TestRunsService(makeConfig());
    const internal = service as any;
    internal.testResultIdsByExternalId.set("ext-1", "existing-inprogress-id");

    await service.loadAutotests("run-1", [makeResult()]);

    expect(internal._client.adaptersTestRunsIdTestResultsPost).toHaveBeenCalledTimes(1);
    expect(internal._testResults.updateTestResult).not.toHaveBeenCalled();
  });

  it("allows repeated POST for the same externalId (retry attempts)", async () => {
    const service = new TestRunsService(makeConfig());
    const internal = service as any;

    await service.loadAutotests("run-1", [makeResult({ outcome: "Failed" })]);
    await service.loadAutotests("run-1", [makeResult({ outcome: "Passed" })]);

    expect(internal._client.adaptersTestRunsIdTestResultsPost).toHaveBeenCalledTimes(2);
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
