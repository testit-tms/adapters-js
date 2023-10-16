import { FullConfig } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { ConfigComposer, Client, StrategyFactory, IStrategy } from "testit-js-commons";
import { Converter } from "./converter";

export type ReporterOptions = {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  environmentInfo?: Record<string, string>;
};

class TmsReporter implements Reporter {
  config!: FullConfig;
  suite!: Suite;
  resultsDir!: string;
  options: ReporterOptions;
  strategy: IStrategy;
  private testCache = new Array<TestCase>();
  private globalStartTime = new Date();

  constructor(options: ReporterOptions) {
    this.options = { suiteTitle: true, detail: true, ...options };
    const config = new ConfigComposer().compose();
    const client = new Client(config);
    this.strategy = StrategyFactory.create(client, config);
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  onTestBegin(test: TestCase): void {
    this.testCache.push(test);
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const autotest = Converter.convertTestCaseToAutotestPost(test, result);

    this.strategy.loadAutotest(
      autotest,
      Converter.convertStatus(result.status, test.expectedStatus) == "Passed");
    this.strategy.loadTestRun([Converter.convertAutotestPostToAutotestResult(autotest, test, result)]);
  }

  onEnd(): void {
    this.addSkippedResults();
  }

  addSkippedResults() {
    const unprocessedCases = this.suite
      .allTests()
      .filter((testCase: any) => !this.testCache.find(testCase));

    unprocessedCases.forEach((testCase: any) => {
      this.onTestEnd(testCase, {
        status: "skipped",
        attachments: [],
        duration: 0,
        errors: [],
        parallelIndex: 0,
        workerIndex: 0,
        retry: 0,
        steps: [],
        stderr: [],
        stdout: [],
        startTime: this.globalStartTime,
      });
    });
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default TmsReporter;

export * from "./labels";
