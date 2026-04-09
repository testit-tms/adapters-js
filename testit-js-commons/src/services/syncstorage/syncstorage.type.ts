import { Outcome } from "../../common";
import { AutotestResult } from "../testruns";

export type WorkerStatus = "in_progress" | "completed";

export interface TestResultCutModel {
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
}

export function toTestResultCutModel(result: AutotestResult): TestResultCutModel {
  return {
    autoTestExternalId: result.autoTestExternalId,
    statusCode: result.outcome,
    startedOn: result.startedOn,
  };
}
