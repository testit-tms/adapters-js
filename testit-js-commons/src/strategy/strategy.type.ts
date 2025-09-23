import { AutotestPost, AutotestResult, TestRunId } from "../services";

export interface IStrategy {
  readonly testRunId: Promise<TestRunId>;
  readonly testsInRun?: Promise<string[] | undefined>;

  setup(): Promise<void>;
  teardown(): Promise<void>;

  loadAutotest(autotest: AutotestPost, status: string): Promise<void>;
  loadTestRun(autotests: AutotestResult[]): Promise<void>;
}
