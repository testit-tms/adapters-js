import { FullConfig } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { ConfigComposer, StrategyFactory, IStrategy, Utils, Additions, Attachment, AdapterConfig } from "testit-js-commons";
import { Converter } from "./converter";
import { MetadataMessage } from "./labels";
import { isAllStepsWithPassedOutcome, processAttachmentExtensions, stepAttachRegexp } from "./utils";
import { Result, ResultAttachment } from "./models/result";
import path from "path";

export type ReporterOptions = {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  environmentInfo?: Record<string, string>;
  tmsOptions?: AdapterConfig;
};

class TmsReporter implements Reporter {
  config!: FullConfig;
  suite!: Suite;
  options: ReporterOptions;
  strategy: IStrategy;
  private readonly additions: Additions;
  private testCache = new Array<TestCase>();
  private stepsMap = new Map<TestStep, TestCase>();
  private attachmentStepsCache = new Array<TestStep>();
  private attachmentsMap = new Map<Attachment, TestStep>();
  private loadTestPromises = new Array<Promise<void>>();

  constructor(options: ReporterOptions) {
    this.options = { suiteTitle: true, detail: true, ...options };
    const config = new ConfigComposer().compose(options.tmsOptions);
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
      this.loadTest(
        test,
        {
          status: result.status,
          attachments: this._processAttachmentsWithExtensions(result),
          duration: result.duration,
          errors: result.errors,
          error: result.error,
        })
    );
  }

  // fix issues with trace and video files on playwright
  private _processAttachmentsWithExtensions(result: TestResult): ResultAttachment[] {
    return result.attachments.map(processAttachmentExtensions)
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
    await this.addSkippedResults();
  }

  async addSkippedResults(): Promise<void> {
    const unprocessedCases = this.suite
      .allTests()
      .filter((testCase: any) => !this.testCache.includes(testCase));

    unprocessedCases.forEach(async (testCase: any) => {
      await this.loadTest(testCase, {
        status: "skipped",
        attachments: [],
        duration: 0,
        errors: [],
      });
    });
  }

  printsToStdio(): boolean {
    return false;
  }

  private getDictionariesByTest(test: TestCase): string[] {
    const location = test.parent.title;

    if (location == undefined) {
      return [];
    }

    return location.split(path.sep);
  }

  private async getAutotestData(
    test: TestCase,
    result: Result
  ) {
    const autotestData: MetadataMessage = {
      externalId: Utils.getHash(test.title),
      displayName: test.title,
      addAttachments: [],
      externalKey: test.title,
    };

    const dictionaries: string[] = this.getDictionariesByTest(test);
    const namespace: string = dictionaries
      .slice(0, -1)
      .join(path.sep);
    const classname: string = dictionaries[dictionaries.length - 1];

    if (namespace != undefined && namespace.length > 0) {
      autotestData.namespace = namespace;
    }

    if (classname != undefined && classname.length > 0) {
      autotestData.classname = classname;
    }

    for (const attachment of result.attachments) {
      if (!attachment.body) {
        if (attachment.path && attachment.name !== "screenshot") {
          const content = Utils.readBufferSync(attachment.path);

          await this.additions.addAttachments(content, attachment.name)
            .then((ids: any) => {
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

        if (metadata.tags) {
          autotestData.tags = metadata.tags;
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

        await this.additions.addAttachments(attachment.body,
            attachment.name.replace(stepAttachRegexp, ""))
            .then((ids: any[]) => {
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

  private async loadTest(test: TestCase, result: Result): Promise<void> {
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
      Converter.convertStatus(result.status, test.expectedStatus));

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
