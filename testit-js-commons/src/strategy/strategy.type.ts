import { AutotestPost, AutotestResult, TestRunId } from "../services";

export interface IStrategy {
  readonly testRunId: Promise<TestRunId>;
  readonly testsInRun?: Promise<string[] | undefined>;

  setup(): Promise<void>;
  teardown(): Promise<void>;
  /** Refresh sync-storage worker LastStatus so Force Work X does not fire mid-run. */
  touchWorker(): Promise<void>;

  loadAutotest(autotest: AutotestPost, status: string): Promise<void>;
  loadTestRun(autotests: AutotestResult[]): Promise<void>;
  updateSetupTeardown(autotests: AutotestResult[]): Promise<void>;
}
