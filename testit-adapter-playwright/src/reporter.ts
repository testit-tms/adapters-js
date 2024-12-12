import { FullConfig } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { ConfigComposer, StrategyFactory, IStrategy, Utils, Additions, Attachment } from "testit-js-commons";
import { Converter, Status } from "./converter";
import { MetadataMessage } from "./labels";
import { isAllStepsWithPassedOutcome, stepAttachRegexp } from "./utils";

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
  private stepsMap = new Map<TestStep, TestCase>();
  private attachmentStepsCache = new Array<TestStep>();
  private attachmentsMap = new Map<Attachment, TestStep>();
  private globalStartTime = new Date();
  private loadTestPromises = new Array<Promise<void>>();

  constructor(options: ReporterOptions) {
    this.options = { suiteTitle: true, detail: true, ...options };
    const config = new ConfigComposer().compose();
    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  onTestBegin(test: TestCase): void {
    this.testCache.push(test);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.loadTestPromises.push(
      this.loadTest(test, result)
    );
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!this.testCache.includes(test)) {
      return;
    }
    if (step.title.match(stepAttachRegexp)) {
      this.attachmentStepsCache.push(step);
      return;
    }
    if (step.category !== "test.step") {
      return;
    }
    if (step.parent) {
      return;
    }
    if (this.stepsMap.get(step)) {
      return;
    }
    this.stepsMap.set(step, test);
  }

  async onEnd(): Promise<void> {
    await Promise.all(this.loadTestPromises);
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
      addAttachments: [],
      externalKey: test.title,
    };

    for (const attachment of result.attachments) {
      if (!attachment.body) {
        if (attachment.path && attachment.name !== "screenshot") {
          const content = Utils.readBuffer(attachment.path);

          await this.additions.addAttachments(content, attachment.name)
            .then((ids) => {
              autotestData.addAttachments?.push(...ids);
            });
        }
        
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
          autotestData.addMessage = metadata.addMessage;
        }

        if (metadata.params) {
          autotestData.params = metadata.params;
        }

        if (metadata.workItemIds) {
          autotestData.workItemIds = metadata.workItemIds;
        }

        continue;
      }

      if (attachment.name.match(stepAttachRegexp)) {
        const step = this.attachmentStepsCache.find((step: TestStep) => step.title === attachment.name);

        await this.additions.addAttachments(attachment.body, attachment.name.replace(stepAttachRegexp, "")).then((ids) => {
          if (step?.parent) {
            this.attachmentsMap.set(ids[0], step.parent);
            return;
          }
          autotestData.addAttachments?.push(...ids);
        });
      }
    }

    return autotestData;
  }

  private async loadTest(test: TestCase, result: TestResult): Promise<void> {
    const autotestData = await this.getAutotestData(test, result);
    const autotest = Converter.convertTestCaseToAutotestPost(autotestData);
    const steps = [...this.stepsMap.keys()].filter((step: TestStep) => this.stepsMap.get(step) === test);
    const stepResults = Converter.convertTestStepsToSteps(steps, this.attachmentsMap);

    if (!isAllStepsWithPassedOutcome(stepResults)) {
      result.status = "failed";
    }

    autotest.steps = Converter.convertTestStepsToShortSteps(steps);

    await this.strategy.loadAutotest(
      autotest,
      Converter.convertStatus(result.status, test.expectedStatus) == Status.PASSED);

    const autotestResult = Converter.convertAutotestPostToAutotestResult(
      autotestData,
      test,
      result);

    autotestResult.stepResults = stepResults;

    await this.strategy.loadTestRun([autotestResult]);
  }
}

export default TmsReporter;

export * from "./labels";
