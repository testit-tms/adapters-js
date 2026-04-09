import { Outcome } from "../../common";
import { AutotestResult } from "../testruns";

export type WorkerStatus = "in_progress" | "completed";

export interface TestResultCutModel {
  projectId: string;
  autoTestExternalId: string;
  statusCode: Outcome;
  startedOn?: Date;
}

export interface ISyncStorageRunner {
  start(): Promise<boolean>;
  isActive(): boolean;
  isMasterWorker(): boolean;
  isAlreadyInProgress(): boolean;
  sendInProgressTestResult(model: TestResultCutModel): Promise<boolean>;
  setWorkerStatus(status: WorkerStatus): Promise<void>;
  completeProcessing(): Promise<void>;
}

export function toTestResultCutModel(result: AutotestResult, projectId: string): TestResultCutModel {
  return {
    projectId,
    autoTestExternalId: result.autoTestExternalId,
    statusCode: result.outcome,
    startedOn: result.startedOn,
  };
}
