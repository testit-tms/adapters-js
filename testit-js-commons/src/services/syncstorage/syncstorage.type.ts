import { Outcome } from "../../common";
import { AutotestResult } from "../testruns";

export type WorkerStatus = "in_progress" | "completed";

/** Same mapping as TestRunConverter.mapToStatusType — TMS expects both fields on the cut model. */
const OUTCOME_TO_STATUS_TYPE: Record<Outcome, string> = {
  Passed: "Succeeded",
  Failed: "Failed",
  Blocked: "Incomplete",
  Skipped: "Incomplete",
};

export interface TestResultCutModel {
  projectId: string;
  autoTestExternalId: string;
  statusCode: Outcome;
  statusType: string;
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
    statusType: OUTCOME_TO_STATUS_TYPE[result.outcome],
    startedOn: result.startedOn,
  };
}
