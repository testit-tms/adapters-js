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

export class SyncStorageRunner implements ISyncStorageRunner {
  private static readonly VERSION = "v0.2.3";
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

  constructor(private readonly testRunId: string, private readonly config: AdapterConfig) {
    this.workerPid = `worker-${process.pid}-${Date.now()}`;
    this.baseUrl = config.url;
    this.port = config.syncStoragePort ?? "49152";
    this.serviceUrl = `http://localhost:${this.port}`;
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

      const response = await this.post<RegisterResponse>("/register", {
        pid: this.workerPid,
        testRunId: this.testRunId,
        baseUrl: this.baseUrl,
        privateToken: this.config.privateToken,
      }, SyncStorageRunner.RETRY_COUNT);

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
      return false;
    }

    try {
      await this.post(`/in_progress_test_result?testRunId=${encodeURIComponent(this.testRunId)}`, model, SyncStorageRunner.RETRY_COUNT);
      this.alreadyInProgress = true;
      return true;
    } catch (error) {
      console.warn(`Sync storage in-progress publish failed: ${error}`);
      return false;
    }
  }

  public async setWorkerStatus(status: WorkerStatus): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      await this.post("/set_worker_status", {
        pid: this.workerPid,
        status,
        testRunId: this.testRunId,
      }, SyncStorageRunner.RETRY_COUNT);
    } catch (error) {
      console.warn(`Sync storage set worker status failed: ${error}`);
    }
  }

  public async completeProcessing(): Promise<void> {
    if (!this.running || !this.isMaster) {
      return;
    }

    try {
      await this.get(`/wait_completion?testRunId=${encodeURIComponent(this.testRunId)}`, SyncStorageRunner.RETRY_COUNT);
      return;
    } catch {
      // Fallback to force completion when wait endpoint is unavailable or times out.
    }

    try {
      await this.get(`/force_completion?testRunId=${encodeURIComponent(this.testRunId)}`, SyncStorageRunner.RETRY_COUNT);
    } catch (error) {
      console.warn(`Sync storage completion failed: ${error}`);
    }
  }

  private async healthcheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, { method: "GET" });
      return response.ok;
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

  private async post<T = unknown>(path: string, body: unknown, retries = 1): Promise<T> {
    return await this.withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SyncStorageRunner.REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${this.serviceUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        return await this.parseResponse<T>(response);
      } finally {
        clearTimeout(timeout);
      }
    }, retries);
  }

  private async get<T = unknown>(path: string, retries = 1): Promise<T> {
    return await this.withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SyncStorageRunner.REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${this.serviceUrl}${path}`, {
          method: "GET",
          signal: controller.signal,
        });
        return await this.parseResponse<T>(response);
      } finally {
        clearTimeout(timeout);
      }
    }, retries);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {} as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text) as T;
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
