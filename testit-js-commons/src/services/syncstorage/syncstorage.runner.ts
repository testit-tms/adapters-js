import { createWriteStream, existsSync, mkdirSync } from "fs";
import { chmod } from "fs/promises";
import { get as httpGet } from "http";
import { get } from "https";
import { join } from "path";
import { arch, platform } from "process";
import { spawn, ChildProcess } from "child_process";
import { AdapterConfig } from "../../common";
import { isSyncStorageDebug } from "../../common/utils";
import { ISyncStorageRunner, TestResultCutModel, WorkerStatus } from "./syncstorage.type";
import logger from "../../logger";

type RegisterResponse = {
  is_master?: boolean;
};

type PortAction = "START_NEW" | "ATTACH" | "TRY_NEXT";

// Generated sync-storage client is bundled into lib/sync-storage/dist during build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SyncStorageClient = require("../../sync-storage/dist/index");

export class SyncStorageRunner implements ISyncStorageRunner {
  private static readonly VERSION = "v0.3.12";
  private static readonly STARTUP_TIMEOUT_MS = 30000;
  private static readonly STARTUP_POLL_MS = 1000;
  private static readonly PROCESS_WARMUP_MS = 2000;
  private static readonly REQUEST_TIMEOUT_MS = 15000;
  private static readonly RETRY_COUNT = 3;
  private static readonly IN_PROGRESS_POLL_MS = 200;
  private static readonly DEFAULT_PORT_MAX_BUMP = 10;
  private static readonly REPO_BASE =
    "https://github.com/testit-tms/sync-storage-public/releases/download";

  private readonly workerPid: string;
  private readonly baseUrl: string;
  private readonly preferredPort: number;
  private port: string;
  private serviceUrl: string;
  private isMaster = false;
  private alreadyInProgress = false;
  private inProgressPublishing = false;
  private running = false;
  private syncStorageProcess?: ChildProcess;
  private healthApi: any;
  private workersApi: any;
  private testResultsApi: any;
  private completionApi: any;
  private readonly registerRequestModel: any;
  private readonly setWorkerStatusRequestModel: any;
  private readonly testResultCutModel: any;

  constructor(private readonly testRunId: string, private readonly config: AdapterConfig) {
    this.workerPid = `worker-${process.pid}-${Date.now()}`;
    this.baseUrl = config.url;
    this.preferredPort = SyncStorageRunner.parsePort(config.syncStoragePort, 49152);
    this.port = String(this.preferredPort);
    this.serviceUrl = `http://localhost:${this.port}`;

    this.registerRequestModel = SyncStorageClient.RegisterRequest;
    this.setWorkerStatusRequestModel = SyncStorageClient.SetWorkerStatusRequest;
    this.testResultCutModel = SyncStorageClient.TestResultCutApiModel;
    this.rebindClients();
  }

  public static parsePort(value: string | undefined | null, defaultPort: number): number {
    if (value == null || value === "" || value === "null") {
      return defaultPort;
    }
    const parsed = Number.parseInt(String(value).trim(), 10);
    return Number.isFinite(parsed) ? parsed : defaultPort;
  }

  public static resolvePortMaxBump(): number {
    const raw =
      process.env.SYNC_STORAGE_PORT_MAX_BUMP ||
      process.env.TMS_SYNC_STORAGE_PORT_MAX_BUMP;
    if (!raw) {
      return SyncStorageRunner.DEFAULT_PORT_MAX_BUMP;
    }
    const parsed = Number.parseInt(String(raw).trim(), 10);
    return Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : SyncStorageRunner.DEFAULT_PORT_MAX_BUMP;
  }

  public static resolvePortAction(
    healthOk: boolean,
    runningTestRunId: string | undefined,
    myTestRunId: string
  ): PortAction {
    if (!healthOk) {
      return "START_NEW";
    }
    if (!runningTestRunId) {
      return "ATTACH";
    }
    if (runningTestRunId === myTestRunId) {
      return "ATTACH";
    }
    return "TRY_NEXT";
  }

  /**
   * Start or attach. Foreign testRunId / bind-register race → port+1 .. +maxBump.
   * Do not process.exit-kill SS (detached / CI wait-completion); wait is completeProcessing().
   */
  public async start(): Promise<boolean> {
    try {
      if (this.running) {
        return true;
      }

      const maxBump = SyncStorageRunner.resolvePortMaxBump();
      for (let offset = 0; offset <= maxBump; offset++) {
        const candidate = this.preferredPort + offset;
        this.port = String(candidate);
        this.rebindClients();

        const healthOk = await this.healthcheck();
        const runningId = healthOk ? await this.fetchHealthTestRunId() : undefined;
        const action = SyncStorageRunner.resolvePortAction(
          healthOk,
          runningId,
          this.testRunId
        );

        if (action === "TRY_NEXT") {
          logger.info(
            `Port ${candidate} busy with testRunId=${runningId}; trying ${candidate + 1}`
          );
          continue;
        }

        if (candidate !== this.preferredPort) {
          logger.info(
            `syncStoragePort effective=${this.port} (preferred=${this.preferredPort})`
          );
        }

        if (action === "ATTACH") {
          if (!runningId) {
            logger.warn(
              `Existing sync-storage on port ${this.port} does not report testRunId in /health; ` +
                `compatibility cannot be verified. Current testRunId: ${this.testRunId}`
            );
          }
          if (await this.tryRegister()) {
            this.running = true;
            return true;
          }
          logger.info(
            `Attach/register failed on port ${candidate} (race or incompatible); trying next`
          );
          continue;
        }

        if (await this.tryStartOwnedProcess()) {
          if (await this.tryRegister()) {
            this.running = true;
            return true;
          }
          this.cleanupFailedSpawn();
          logger.info(
            `Could not claim port ${candidate} for testRunId=${this.testRunId}; trying next`
          );
          continue;
        }

        this.cleanupFailedSpawn();
        logger.info(
          `Could not start sync-storage on port ${candidate}; trying next`
        );
      }

      logger.warn(
        `No free sync-storage port in ${this.preferredPort}..${
          this.preferredPort + maxBump
        } for testRunId ${this.testRunId}`
      );
      return false;
    } catch (error) {
      logger.warn(`Sync storage start failed: ${error}`);
      this.cleanupFailedSpawn();
      return false;
    }
  }

  private rebindClients(): void {
    this.serviceUrl = `http://localhost:${this.port}`;
    const apiClient = new SyncStorageClient.ApiClient(this.serviceUrl);
    apiClient.timeout = SyncStorageRunner.REQUEST_TIMEOUT_MS;
    this.healthApi = new SyncStorageClient.HealthApi(apiClient);
    this.workersApi = new SyncStorageClient.WorkersApi(apiClient);
    this.testResultsApi = new SyncStorageClient.TestResultsApi(apiClient);
    this.completionApi = new SyncStorageClient.CompletionApi(apiClient);
  }

  private async tryRegister(): Promise<boolean> {
    try {
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
      return true;
    } catch (error) {
      logger.warn(`Sync storage register failed on port ${this.port}: ${error}`);
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

  public async waitForInProgressPublished(timeoutMs: number): Promise<boolean> {
    if (!this.running) {
      return false;
    }
    if (this.alreadyInProgress) {
      return true;
    }
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while (Date.now() < deadline) {
      try {
        const state = await this.testResultsApi.inProgressPublishedGet(this.testRunId);
        if (Boolean(state?.published)) {
          this.alreadyInProgress = true;
          return true;
        }
      } catch {
        // Endpoint can be temporarily unavailable; continue best-effort polling.
      }
      await this.delay(SyncStorageRunner.IN_PROGRESS_POLL_MS);
    }
    return false;
  }

  public async sendInProgressTestResult(model: TestResultCutModel): Promise<boolean> {
    if (!this.running || !this.isMaster || this.alreadyInProgress || this.inProgressPublishing) {
      if (isSyncStorageDebug()) {
        logger.debug("[syncstorage] skip in-progress cut publish", {
          reason: {
            notRunning: !this.running,
            notMaster: !this.isMaster,
            alreadyInProgress: this.alreadyInProgress,
            publishingInFlight: this.inProgressPublishing,
          },
          workerPid: this.workerPid,
        });
      }
      return false;
    }

    if (!model.projectId || !model.autoTestExternalId || !model.statusCode || !model.statusType) {
      logger.warn(
        "Sync storage in-progress payload is incomplete; skipping publish.",
      );
      if (isSyncStorageDebug()) {
        logger.debug("[syncstorage] incomplete in-progress cut payload", {
          hasProjectId: Boolean(model.projectId),
          hasAutoTestExternalId: Boolean(model.autoTestExternalId),
          hasStatusCode: Boolean(model.statusCode),
          hasStatusType: Boolean(model.statusType),
        });
      }
      return false;
    }

    this.inProgressPublishing = true;
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
      if (isSyncStorageDebug()) {
        logger.debug("[syncstorage] alreadyInProgress set", {
          workerPid: this.workerPid,
          autoTestExternalId: model.autoTestExternalId,
        });
        logger.debug("[syncstorage] in-progress cut published", {
          workerPid: this.workerPid,
          autoTestExternalId: model.autoTestExternalId,
        });
      }
      return true;
    } catch (error) {
      logger.warn(`Sync storage in-progress publish failed: ${error}`);
      if (isSyncStorageDebug()) {
        logger.debug("[syncstorage] in-progress cut publish failed", {
          workerPid: this.workerPid,
          autoTestExternalId: model.autoTestExternalId,
        });
      }
      return false;
    } finally {
      this.inProgressPublishing = false;
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
      logger.warn(`Sync storage set worker status failed: ${error}`);
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
      logger.warn(`Sync storage completion failed: ${error}`);
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

  private async fetchHealthTestRunId(): Promise<string | undefined> {
    return new Promise((resolve) => {
      const req = httpGet(
        `http://localhost:${this.port}/health`,
        { timeout: 1000 },
        (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            try {
              const data = JSON.parse(body);
              resolve(
                typeof data.testRunId === "string" && data.testRunId
                  ? data.testRunId
                  : undefined
              );
            } catch {
              resolve(undefined);
            }
          });
        }
      );
      req.on("error", () => resolve(undefined));
      req.on("timeout", () => {
        req.destroy();
        resolve(undefined);
      });
    });
  }

  private async tryStartOwnedProcess(): Promise<boolean> {
    try {
      const executablePath = await this.prepareExecutable();
      const command = [
        "--testRunId", this.testRunId,
        "--port", this.port,
        "--baseURL", this.baseUrl,
        "--privateToken", this.config.privateToken,
      ];

      // Detached where supported; do not process.exit-kill SS (CI/Work X must outlive runner).
      // Wait for Work X via completeProcessing(), not exit hooks.
      this.syncStorageProcess = spawn(executablePath, command, {
        cwd: join(process.cwd(), "build", ".caches"),
        stdio: "ignore",
        detached: true,
      });
      this.syncStorageProcess.unref?.();

      const started = await this.waitForStartup();
      if (!started) {
        return false;
      }

      const runningId = await this.fetchHealthTestRunId();
      if (runningId && runningId !== this.testRunId) {
        logger.info(
          `Port ${this.port} became sync-storage for other testRunId=${runningId} after start race`
        );
        return false;
      }

      await this.delay(SyncStorageRunner.PROCESS_WARMUP_MS);
      return true;
    } catch (error) {
      logger.warn(`Sync storage local process start failed: ${error}`);
      return false;
    }
  }

  private cleanupFailedSpawn(): void {
    this.running = false;
    this.isMaster = false;
    if (this.syncStorageProcess && !this.syncStorageProcess.killed) {
      try {
        this.syncStorageProcess.kill();
      } catch {
        // best-effort
      }
    }
    this.syncStorageProcess = undefined;
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
