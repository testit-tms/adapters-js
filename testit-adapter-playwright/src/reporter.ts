import { FullConfig } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { ConfigComposer, Client, StrategyFactory, IStrategy, Utils, Additions } from "testit-js-commons";
import { Converter } from "./converter";
import { MetadataMessage } from "./labels";

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
  private readonly additions: Additions;
  private testCache = new Array<TestCase>();
  private globalStartTime = new Date();

  constructor(options: ReporterOptions) {
    this.options = { suiteTitle: true, detail: true, ...options };
    const config = new ConfigComposer().compose();
    const client = new Client(config);
    this.strategy = StrategyFactory.create(client, config);
    this.additions = new Additions(client);
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  onTestBegin(test: TestCase): void {
    this.testCache.push(test);
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const autotest = Converter.convertTestCaseToAutotestPost(await this.getAutotestData(test, result));

    await this.strategy.loadAutotest(
      autotest,
      Converter.convertStatus(result.status, test.expectedStatus) == "Passed");
    await this.strategy.loadTestRun([Converter.convertAutotestPostToAutotestResult(
      await this.getAutotestData(test, result),
      test,
      result)]);
  }

  onEnd(): void {
    this.addSkippedResults();
  }

  addSkippedResults() {
    const unprocessedCases = this.suite
      .allTests()
      .filter((testCase: any) => !this.testCache.includes(testCase));

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

  private async getAutotestData(
    test: TestCase,
    result: TestResult
  ) {
    const autotestData: MetadataMessage = {
      externalId: Utils.getHash(test.title),
      displayName: test.title,
      addAttachments: []
    };

    for (const attachment of result.attachments) {
      if (!attachment.body || !attachment.path) {
        continue;
      }
  
      if (attachment.contentType === "application/vnd.tms.metadata+json") {
        const metadata: MetadataMessage = JSON.parse(attachment.body.toString());

        if (metadata.externalId) {
          autotestData.externalId = metadata.externalId;
        }

        if (metadata.displayName) {
          autotestData.displayName = metadata.displayName;
        }

        if (metadata.title) {
          autotestData.title = metadata.title;
        }

        if (metadata.description) {
          autotestData.description = metadata.description;
        }

        if (metadata.labels) {
          autotestData.labels = metadata.labels;
        }

        if (metadata.links) {
          autotestData.links = metadata.links;
        }

        if (metadata.namespace) {
          autotestData.namespace = metadata.namespace;
        }

        if (metadata.classname) {
          autotestData.classname = metadata.classname;
        }

        if (metadata.addLinks) {
          autotestData.addLinks = metadata.addLinks;
        }

        if (metadata.addMessage) {
          autotestData.classname = metadata.addMessage;
        }

        if (metadata.params) {
          autotestData.params = metadata.params;
        }

        continue;
      }

      await this.additions.addAttachments(attachment.body.toString(), attachment.name).then((ids) => {
        autotestData.addAttachments?.push(...ids);
      });
    }

    return autotestData;
  }
}

export default TmsReporter;

export * from "./labels";
