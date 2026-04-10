import { createWriteStream, existsSync, mkdirSync } from "fs";
import { chmod } from "fs/promises";
import { get } from "https";
import { join } from "path";
import { arch, platform } from "process";
import { spawn, ChildProcess } from "child_process";
import { AdapterConfig } from "../../common";
import { ISyncStorageRunner, TestResultCutModel, WorkerStatus } from "./syncstorage.type";

type RegisterResponse = {
  is_master?: boolean;
};

// Generated sync-storage client is bundled into lib/sync-storage/dist during build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SyncStorageClient = require("../../sync-storage/dist/index");

export class SyncStorageRunner implements ISyncStorageRunner {
  private static readonly VERSION = "v0.2.4";
  private static readonly STARTUP_TIMEOUT_MS = 30000;
  private static readonly STARTUP_POLL_MS = 1000;
  private static readonly PROCESS_WARMUP_MS = 2000;
  private static readonly REQUEST_TIMEOUT_MS = 15000;
  private static readonly RETRY_COUNT = 3;
  private static readonly REPO_BASE =
    "https://github.com/testit-tms/sync-storage-public/releases/download";

  private readonly workerPid: string;
  private readonly baseUrl: string;
  private readonly serviceUrl: string;
  private readonly port: string;
  private isMaster = false;
  private alreadyInProgress = false;
  private running = false;
  private syncStorageProcess?: ChildProcess;
  private readonly healthApi: any;
  private readonly workersApi: any;
  private readonly testResultsApi: any;
  private readonly completionApi: any;
  private readonly registerRequestModel: any;
  private readonly setWorkerStatusRequestModel: any;
  private readonly testResultCutModel: any;

  constructor(private readonly testRunId: string, private readonly config: AdapterConfig) {
    this.workerPid = `worker-${process.pid}-${Date.now()}`;
    this.baseUrl = config.url;
    this.port = config.syncStoragePort ?? "49152";
    this.serviceUrl = `http://localhost:${this.port}`;

    const apiClient = new SyncStorageClient.ApiClient(this.serviceUrl);
    apiClient.timeout = SyncStorageRunner.REQUEST_TIMEOUT_MS;
    this.healthApi = new SyncStorageClient.HealthApi(apiClient);
    this.workersApi = new SyncStorageClient.WorkersApi(apiClient);
    this.testResultsApi = new SyncStorageClient.TestResultsApi(apiClient);
    this.completionApi = new SyncStorageClient.CompletionApi(apiClient);
    this.registerRequestModel = SyncStorageClient.RegisterRequest;
    this.setWorkerStatusRequestModel = SyncStorageClient.SetWorkerStatusRequest;
    this.testResultCutModel = SyncStorageClient.TestResultCutApiModel;
  }

  public async start(): Promise<boolean> {
    try {
      const healthy = await this.healthcheck();
      if (!healthy) {
        const started = await this.startLocalProcess();
        if (!started) {
          return false;
        }
      }

      const request = this.registerRequestModel.constructFromObject({
        pid: this.workerPid,
        testRunId: this.testRunId,
        baseUrl: this.baseUrl,
        privateToken: this.config.privateToken,
      });
      const response = await this.withRetry<RegisterResponse>(
        async () => this.workersApi.registerPost(request),
        SyncStorageRunner.RETRY_COUNT
      );

      this.isMaster = Boolean(response?.is_master);
      this.running = true;
      return true;
    } catch (error) {
      console.warn(`Sync storage start failed: ${error}`);
      return false;
    }
  }

  public isActive(): boolean {
    return this.running;
  }

  public isMasterWorker(): boolean {
    return this.isMaster;
  }

  public isAlreadyInProgress(): boolean {
    return this.alreadyInProgress;
  }

  public async sendInProgressTestResult(model: TestResultCutModel): Promise<boolean> {
    if (!this.running || !this.isMaster || this.alreadyInProgress) {
      console.log("[syncstorage] skip in-progress cut publish", {
        reason: {
          notRunning: !this.running,
          notMaster: !this.isMaster,
          alreadyInProgress: this.alreadyInProgress,
        },
        workerPid: this.workerPid,
      });
      return false;
    }

    if (!model.projectId || !model.autoTestExternalId || !model.statusCode || !model.statusType) {
      console.warn(
        "Sync storage in-progress payload is incomplete; skipping publish.",
      );
      console.log("[syncstorage] incomplete in-progress cut payload", {
        hasProjectId: Boolean(model.projectId),
        hasAutoTestExternalId: Boolean(model.autoTestExternalId),
        hasStatusCode: Boolean(model.statusCode),
        hasStatusType: Boolean(model.statusType),
      });
      return false;
    }

    try {
      const request = this.testResultCutModel.constructFromObject({
        projectId: model.projectId,
        autoTestExternalId: model.autoTestExternalId,
        statusCode: model.statusCode,
        statusType: model.statusType,
        startedOn: model.startedOn,
      });
      await this.withRetry(
        async () => this.testResultsApi.inProgressTestResultPost(this.testRunId, request),
        SyncStorageRunner.RETRY_COUNT
      );
      this.alreadyInProgress = true;
      console.log("[syncstorage] in-progress cut published", {
        workerPid: this.workerPid,
        autoTestExternalId: model.autoTestExternalId,
      });
      return true;
    } catch (error) {
      console.warn(`Sync storage in-progress publish failed: ${error}`);
      console.log("[syncstorage] in-progress cut publish failed", {
        workerPid: this.workerPid,
        autoTestExternalId: model.autoTestExternalId,
      });
      return false;
    }
  }

  public async setWorkerStatus(status: WorkerStatus): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const request = this.setWorkerStatusRequestModel.constructFromObject({
        pid: this.workerPid,
        status,
        testRunId: this.testRunId,
      });
      await this.withRetry(
        async () => this.workersApi.setWorkerStatusPost(request),
        SyncStorageRunner.RETRY_COUNT
      );
    } catch (error) {
      console.warn(`Sync storage set worker status failed: ${error}`);
    }
  }

  public async completeProcessing(): Promise<void> {
    if (!this.running || !this.isMaster) {
      return;
    }

    try {
      await this.withRetry(
        async () => this.completionApi.waitCompletionGet(this.testRunId),
        SyncStorageRunner.RETRY_COUNT
      );
      return;
    } catch {
      // Fallback to force completion when wait endpoint is unavailable or times out.
    }

    try {
      await this.withRetry(
        async () => this.completionApi.forceCompletionGet(this.testRunId),
        SyncStorageRunner.RETRY_COUNT
      );
    } catch (error) {
      console.warn(`Sync storage completion failed: ${error}`);
    }
  }

  private async healthcheck(): Promise<boolean> {
    try {
      await this.withRetry(
        async () => this.healthApi.healthGet(),
        1
      );
      return true;
    } catch {
      return false;
    }
  }

  private async startLocalProcess(): Promise<boolean> {
    try {
      const executablePath = await this.prepareExecutable();
      const command = [
        "--testRunId", this.testRunId,
        "--port", this.port,
        "--baseURL", this.baseUrl,
        "--privateToken", this.config.privateToken,
      ];

      this.syncStorageProcess = spawn(executablePath, command, {
        cwd: join(process.cwd(), "build", ".caches"),
        stdio: "ignore",
        detached: platform === "win32",
      });

      const started = await this.waitForStartup();
      if (started) {
        await this.delay(SyncStorageRunner.PROCESS_WARMUP_MS);
      }
      return started;
    } catch (error) {
      console.warn(`Sync storage local process start failed: ${error}`);
      return false;
    }
  }

  private async waitForStartup(): Promise<boolean> {
    const deadline = Date.now() + SyncStorageRunner.STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await this.healthcheck()) {
        return true;
      }
      await this.delay(SyncStorageRunner.STARTUP_POLL_MS);
    }
    return false;
  }

  private async prepareExecutable(): Promise<string> {
    const cachesDir = join(process.cwd(), "build", ".caches");
    if (!existsSync(cachesDir)) {
      mkdirSync(cachesDir, { recursive: true });
    }

    const fileName = this.getBinaryName();
    const targetPath = join(cachesDir, fileName);
    if (!existsSync(targetPath)) {
      const url = `${SyncStorageRunner.REPO_BASE}/${SyncStorageRunner.VERSION}/${fileName}`;
      await this.downloadFile(url, targetPath);
    }

    if (platform !== "win32") {
      await chmod(targetPath, 0o755);
    }
    return targetPath;
  }

  private getBinaryName(): string {
    const osPart = this.getOsPart();
    const archPart = this.getArchPart();
    const ext = osPart === "windows" ? ".exe" : "";
    return `syncstorage-${SyncStorageRunner.VERSION}-${osPart}_${archPart}${ext}`;
  }

  private getOsPart(): string {
    if (platform === "win32") return "windows";
    if (platform === "darwin") return "darwin";
    if (platform === "linux") return "linux";
    throw new Error(`Unsupported OS: ${platform}`);
  }

  private getArchPart(): string {
    if (arch === "x64") return "amd64";
    if (arch === "arm64") return "arm64";
    throw new Error(`Unsupported arch: ${arch}`);
  }

  private async downloadFile(url: string, targetPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const file = createWriteStream(targetPath);
      const request = get(url, { headers: { "User-Agent": "testit-js-commons" } }, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          this.downloadFile(response.headers.location, targetPath).then(resolve).catch(reject);
          return;
        }

        if (!response.statusCode || response.statusCode >= 400) {
          file.close();
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      });

      request.on("error", (err) => reject(err));
      file.on("error", (err) => reject(err));
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await this.delay(300);
        }
      }
    }
    throw lastError;
  }
}
