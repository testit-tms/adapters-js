import { AutotestPost, AutotestResult, AutotestResultGet, TestRunId } from "../services";

export interface IStrategy {
  readonly testRunId: Promise<TestRunId>;
  readonly testsInRun?: Promise<AutotestResultGet[] | undefined>;

  setup(): Promise<void>;
  teardown(): Promise<void>;

  loadAutotest(autotest: AutotestPost, isPassed: boolean): Promise<void>;
  loadTestRun(autotests: AutotestResult[]): Promise<void>;
}
