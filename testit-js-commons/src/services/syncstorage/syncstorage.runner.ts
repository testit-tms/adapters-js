import { AdapterConfig } from "../../common";
import { ISyncStorageRunner, TestResultCutModel, WorkerStatus } from "./syncstorage.type";

type RegisterResponse = {
  is_master?: boolean;
};

export class SyncStorageRunner implements ISyncStorageRunner {
  private readonly workerPid: string;
  private readonly baseUrl: string;
  private readonly serviceUrl: string;
  private isMaster = false;
  private alreadyInProgress = false;
  private running = false;

  constructor(private readonly testRunId: string, private readonly config: AdapterConfig) {
    this.workerPid = `worker-${process.pid}-${Date.now()}`;
    this.baseUrl = config.url;
    this.serviceUrl = `http://localhost:${config.syncStoragePort ?? "49152"}`;
  }

  public async start(): Promise<boolean> {
    try {
      const healthy = await this.healthcheck();
      if (!healthy) {
        return false;
      }

      const response = await this.post<RegisterResponse>("/register", {
        pid: this.workerPid,
        testRunId: this.testRunId,
        baseUrl: this.baseUrl,
        privateToken: this.config.privateToken,
      });

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
      await this.post(`/in_progress_test_result?testRunId=${encodeURIComponent(this.testRunId)}`, model);
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
      });
    } catch (error) {
      console.warn(`Sync storage set worker status failed: ${error}`);
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

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serviceUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
