import { Attachment, Link, Outcome, Step } from "../../common";
import { AutotestGet } from "../autotests";

export type TestRunId = string;

export type RunState = "NotStarted" | "InProgress" | "Stopped" | "Completed";

export interface TestRunGet {
  id: TestRunId;
  name: string;
  description?: string;
  launchSource?: string;
  startedOn?: Date;
  completedOn?: Date;
  stateName: RunState;
  testResults?: Array<AutotestResultGet>;
}

interface AutotestResultBase {
  links?: Array<Link>;
  message?: string;
  attachments?: Array<Attachment>;
  traces?: string;
  startedOn?: Date;
  completedOn?: Date;
  parameters?: {
    [key: string]: string;
  };
  properties?: {
    [key: string]: string;
  };
}

export interface AutotestResult extends AutotestResultBase {
  autoTestExternalId: string;
  outcome: Outcome;
  duration?: number;
  stepResults?: Array<Step>;
  setupResults?: Array<Step>;
  teardownResults?: Array<Step>;
}

export interface AutotestResultGet extends AutotestResultBase {
  id?: string;
  configurationId?: string;
  autoTest?: AutotestGet;
  autoTestId?: string;
  testRunId?: string;
  comment?: string;
  outcome?: Outcome;
}

export interface ITestRunsService {
  createTestRun(): Promise<string>;
  getTestRun(testRunId: TestRunId): Promise<TestRunGet>;
  startTestRun(testRunId: TestRunId): Promise<void>;
  completeTestRun(testRunId: TestRunId): Promise<void>;
  getAutotests(testRunId: TestRunId): Promise<AutotestResultGet[] | undefined>;
  loadAutotests(testRunId: string, autotests: Array<AutotestResult>): Promise<void>;
}
