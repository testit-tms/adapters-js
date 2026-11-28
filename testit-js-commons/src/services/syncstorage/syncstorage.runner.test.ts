import { SyncStorageRunner } from "./syncstorage.runner";
import { AdapterConfig } from "../../common";
import { spawn } from "child_process";

jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  spawn: jest.fn(() => ({ unref: jest.fn() })),
}));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

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
  beforeEach(() => {
    spawnMock.mockClear();
    delete process.env.TMS_DEBUG_SYNC_STORAGE;
    delete process.env.SYNC_STORAGE_PORT_MAX_BUMP;
  });

  it("resolvePortAction: free / same / foreign / legacy", () => {
    expect(SyncStorageRunner.resolvePortAction(false, undefined, "run-b")).toBe(
      "START_NEW"
    );
    expect(SyncStorageRunner.resolvePortAction(true, "run-a", "run-a")).toBe(
      "ATTACH"
    );
    expect(SyncStorageRunner.resolvePortAction(true, "run-a", "run-b")).toBe(
      "TRY_NEXT"
    );
    expect(SyncStorageRunner.resolvePortAction(true, undefined, "run-b")).toBe(
      "ATTACH"
    );
  });

  it("parsePort defaults on bad input", () => {
    expect(SyncStorageRunner.parsePort(undefined, 49152)).toBe(49152);
    expect(SyncStorageRunner.parsePort("null", 49152)).toBe(49152);
    expect(SyncStorageRunner.parsePort("50000", 49152)).toBe(50000);
  });

  it("should spawn local process with stdio ignored", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.prepareExecutable = jest.fn().mockResolvedValue("/bin/syncstorage");
    internal.waitForStartup = jest.fn().mockResolvedValue(true);
    internal.fetchHealthTestRunId = jest.fn().mockResolvedValue("run-1");
    internal.delay = jest.fn().mockResolvedValue(undefined);

    await internal.tryStartOwnedProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      "/bin/syncstorage",
      expect.arrayContaining(["--testRunId", "run-1"]),
      expect.objectContaining({ stdio: "ignore", detached: true })
    );
  });

  it("should mark runner as active and resolve master status after start", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.fetchHealthTestRunId = jest.fn().mockResolvedValue("run-1");
    internal.workersApi = { registerPost: jest.fn().mockResolvedValue({ is_master: true }) };

    const started = await runner.start();

    expect(started).toBe(true);
    expect(runner.isActive()).toBe(true);
    expect(runner.isMasterWorker()).toBe(true);
  });

  it("should bump port when preferred has foreign testRunId", async () => {
    const runner = new SyncStorageRunner("run-new", makeConfig());
    const internal = runner as any;

    internal.healthcheck = jest.fn().mockImplementation(async () => {
      return internal.port === "49152";
    });
    internal.fetchHealthTestRunId = jest.fn().mockImplementation(async () => {
      return internal.port === "49152" ? "run-old" : undefined;
    });
    internal.tryStartOwnedProcess = jest.fn().mockResolvedValue(true);
    internal.tryRegister = jest.fn().mockResolvedValue(true);

    const started = await runner.start();

    expect(started).toBe(true);
    expect(internal.port).toBe("49153");
    expect(internal.tryStartOwnedProcess).toHaveBeenCalled();
  });

  it("should fail when all ports are busy with foreign testRunId", async () => {
    const runner = new SyncStorageRunner("run-new", makeConfig());
    const internal = runner as any;
    const bumpSpy = jest
      .spyOn(SyncStorageRunner, "resolvePortMaxBump")
      .mockReturnValue(2);
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.fetchHealthTestRunId = jest.fn().mockResolvedValue("run-old");

    const started = await runner.start();

    expect(started).toBe(false);
    bumpSpy.mockRestore();
  });

  it("should send in-progress result only once", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.fetchHealthTestRunId = jest.fn().mockResolvedValue("run-1");
    internal.workersApi = { registerPost: jest.fn().mockResolvedValue({ is_master: true }) };
    internal.testResultsApi = { inProgressTestResultPost: jest.fn().mockResolvedValue({ status: "ok" }) };
    internal.testResultCutModel = { constructFromObject: (obj: any) => obj };

    await runner.start();
    const first = await runner.sendInProgressTestResult({
      projectId: "11111111-1111-1111-1111-111111111111",
      autoTestExternalId: "A",
      statusCode: "Passed",
      statusType: "Succeeded",
      startedOn: new Date(),
    });
    const second = await runner.sendInProgressTestResult({
      projectId: "11111111-1111-1111-1111-111111111111",
      autoTestExternalId: "B",
      statusCode: "Passed",
      statusType: "Succeeded",
      startedOn: new Date(),
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("should skip publish when payload is incomplete", async () => {
    const runner = new SyncStorageRunner("run-1", makeConfig());
    const internal = runner as any;
    internal.healthcheck = jest.fn().mockResolvedValue(true);
    internal.fetchHealthTestRunId = jest.fn().mockResolvedValue("run-1");
    internal.workersApi = { registerPost: jest.fn().mockResolvedValue({ is_master: true }) };
    internal.testResultsApi = { inProgressTestResultPost: jest.fn().mockResolvedValue({ status: "ok" }) };
    internal.testResultCutModel = { constructFromObject: (obj: any) => obj };

    await runner.start();
    const ok = await runner.sendInProgressTestResult({
      projectId: "",
      autoTestExternalId: "A",
      statusCode: "Passed",
      statusType: "Succeeded",
      startedOn: new Date(),
    });

    expect(ok).toBe(false);
    expect(internal.testResultsApi.inProgressTestResultPost).not.toHaveBeenCalled();
  });
});
