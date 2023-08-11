import { AutotestPost, AutotestResult, AutotestResultGet } from "../services";

export interface IStrategy {
  readonly testRunId: Promise<string>;
  readonly testsInRun?: Promise<AutotestResultGet[] | undefined>;

  setup(): Promise<void>;
  teardown(): Promise<void>;

  loadAutotest(autotest: AutotestPost, isPassed: boolean): Promise<void>;
  loadTestRun(autotests: AutotestResult[]): Promise<void>;
}
