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
  attachments?: Array<Attachment>;
  links?: Array<LinkGet>;
}

export interface LinkGet {
  url: string;
  id?: string | null;
  title?: string | null;
  description?: string | null;
  hasInfo: boolean;
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
  autoTestExternalId?: string;
  autoTestId?: string;
  testRunId?: string;
  comment?: string;
  outcome?: Outcome;
}

export interface ITestRunsService {
  createTestRun(): Promise<string>;
  getTestRun(testRunId: TestRunId): Promise<TestRunGet>;
  updateTestRun(testRun: TestRunGet): Promise<void>;
  startTestRun(testRunId: TestRunId): Promise<void>;
  completeTestRun(testRunId: TestRunId): Promise<void>;
  loadAutotests(testRunId: string, autotests: Array<AutotestResult>): Promise<void>;
}
