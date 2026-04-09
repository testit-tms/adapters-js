import { SyncStorageRunner } from "./syncstorage.runner";
import { AdapterConfig } from "../../common";

function makeConfig(): AdapterConfig {
  return {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
    syncStorageEnabled: true,
    syncStoragePort: "49152",
  };
}

describe("SyncStorageRunner", () => {
  it("should mark runner as active and resolve master status after start", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.workersApi = { registerPost: jest.fn().mockResolvedValue({ is_master: true }) };

    const started = await runner.start();

    expect(started).toBe(true);
    expect(runner.isActive()).toBe(true);
    expect(runner.isMasterWorker()).toBe(true);
  });

  it("should send in-progress result only once", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.workersApi = { registerPost: jest.fn().mockResolvedValue({ is_master: true }) };
    internal.testResultsApi = { inProgressTestResultPost: jest.fn().mockResolvedValue({ status: "ok" }) };
    internal.testResultCutModel = { constructFromObject: (obj: any) => obj };

    await runner.start();
    const first = await runner.sendInProgressTestResult({
      autoTestExternalId: "A",
      statusCode: "Passed",
      startedOn: new Date(),
    });
    const second = await runner.sendInProgressTestResult({
      autoTestExternalId: "B",
      statusCode: "Passed",
      startedOn: new Date(),
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
