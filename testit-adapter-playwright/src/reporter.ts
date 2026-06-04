import { FullConfig } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { ConfigComposer, StrategyFactory, IStrategy, Utils, Additions, Attachment, AdapterConfig, BaseStrategy } from "testit-js-commons";
import { Converter } from "./converter";
import { MetadataMessage } from "./labels";
import { applyMetadataTo, releaseTestMetadata, resolveTestMetadata } from "./metadata-store";
import { getTestStatus, processAttachmentExtensions, stepAttachRegexp } from "./utils";
import { Result, ResultAttachment } from "./models/result";
import path from "path";
import { logger } from "testit-js-commons";

export type ReporterOptions = {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  environmentInfo?: Record<string, string>;
  tmsOptions?: AdapterConfig;
};
type ReporterAdapterConfig = AdapterConfig & { importRealtime?: boolean };

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
  private setupPromise: Promise<void> = Promise.resolve();
  private readonly adapterConfig: ReporterAdapterConfig;
  private bufferedResults: Array<{ test: TestCase; result: Result }> = [];

  constructor(options: ReporterOptions) {
    this.options = { suiteTitle: true, detail: true, ...options };
    const config = new ConfigComposer().compose(options.tmsOptions) as ReporterAdapterConfig;
    this.adapterConfig = config;
    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);
    logger.debug("[playwright] reporter init", { importRealtime: Boolean(config.importRealtime) });
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.setupPromise = this.strategy.setup();
  }

  onTestBegin(test: TestCase): void {
    this.testCache.push(test);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const currentResult: Result = {
      status: result.status,
      attachments: this.collectAllAttachments(result),
      duration: result.duration,
      errors: result.errors,
      error: result.error,
      steps: result.steps,
    };
    if (this.adapterConfig.importRealtime) {
      logger.debug("[playwright] onTestEnd realtime", { title: test.title, status: result.status });
      this.loadTestPromises.push(this.runLoadTest(test, currentResult));
      return;
    }
    this.bufferedResults.push({ test, result: currentResult });
  }

  // fix issues with trace and video files on playwright
  private _processAttachmentsWithExtensions(result: TestResult): ResultAttachment[] {
    return result.attachments.map(processAttachmentExtensions);
  }

  private collectAllAttachments(result: TestResult): ResultAttachment[] {
    const out = this._processAttachmentsWithExtensions(result);
    const visitSteps = (steps?: TestStep[]): void => {
      for (const step of steps ?? []) {
        for (const attachment of step.attachments ?? []) {
          out.push(processAttachmentExtensions(attachment));
        }
        visitSteps(step.steps);
      }
    };
    visitSteps(result.steps);
    return out;
  }

  private metadataContext(test: TestCase) {
    const titlePath =
      typeof (test as TestCase & { titlePath?: () => string[] }).titlePath === "function"
        ? (test as TestCase & { titlePath: () => string[] }).titlePath()
        : [test.title];
    return {
      testId: test.id,
      file: test.location.file,
      titlePath,
      title: test.title,
    };
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
    try {
      await this.setupPromise.catch((err: any) => {
        logger.error("TMS Playwright setup failed:", err?.body ?? err?.error ?? err);
      });
      if (!this.adapterConfig.importRealtime) {
        logger.debug("[playwright] onEnd batch flush", { count: this.bufferedResults.length });
        await Promise.allSettled(this.bufferedResults.map(({ test, result }) => this.runLoadTest(test, result)));
      } else {
        logger.debug("[playwright] onEnd await realtime", { pending: this.loadTestPromises.length });
      }
      await Promise.allSettled(this.loadTestPromises);
      await this.addSkippedResults();
    } catch (err: any) {
      logger.error("TMS Playwright onEnd failed:", err?.body ?? err?.error ?? err);
    } finally {
      await this.strategy.teardown().catch((err: any) => {
        logger.error("TMS Playwright teardown failed:", err?.body ?? err?.error ?? err);
      });
    }
  }

  async addSkippedResults(): Promise<void> {
    const unprocessedCases = this.suite
      .allTests()
      .filter((testCase: any) => !this.testCache.includes(testCase));

    await Promise.all(
      unprocessedCases.map((testCase: any) =>
        this.loadTest(testCase, {
          status: "skipped",
          attachments: [],
          duration: 0,
          errors: [],
          steps: [],
        }).catch((err: any) => {
          logger.error(
            "TMS Playwright loadTest (skipped) failed:",
            testCase?.title,
            err?.body ?? err?.error ?? err,
          );
        }),
      ),
    );
  }

  private runLoadTest(test: TestCase, result: Result): Promise<void> {
    return this.setupPromise
      .then(() => this.loadTest(test, result))
      .catch((err) => {
        logger.log("Error processing test result. \n", err?.body ?? err?.error ?? err);
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

    for (const attachment of result.attachments) {
      if (this.isMetadataAttachment(attachment)) {
        continue;
      }

      if (!attachment.body) {
        if (attachment.path && attachment.name !== "screenshot") {
          let content: Buffer;
          try {
            content = Utils.readBufferSync(attachment.path);
          } catch (err: any) {
            if (err?.code === "ENOENT") {
              continue;
            }
            throw err;
          }
          try {
            const ids: any = await this.additions.addAttachments(content, attachment.name);
            autotestData.addAttachments?.push(...ids);
          } catch (err: any) {
            logger.log("Error uploading file attachment. \n", err?.body ?? err?.error ?? err);
          }
        }
        
        continue;
      }
  
      if (attachment.name.match(stepAttachRegexp)) {
        const step = this.attachmentStepsCache.find((step: TestStep) => step.title === attachment.name);
        try {
          const ids: any[] = await this.additions.addAttachments(
            attachment.body,
            attachment.name.replace(stepAttachRegexp, "")
          );
          if (step?.parent) {
            this.attachmentsMap.set(ids[0], step.parent);
            continue;
          }
          autotestData.addAttachments?.push(...ids);
        } catch (err: any) {
          logger.log("Error uploading text attachment. \n", err?.body ?? err?.error ?? err);
        }
      }
    }

    this.applyMetadataAttachments(autotestData, result.attachments);

    const stored = resolveTestMetadata(this.metadataContext(test));
    if (stored) {
      applyMetadataTo(autotestData, stored);
      logger.debug("[playwright] metadata from store", {
        title: test.title,
        namespace: autotestData.namespace,
        classname: autotestData.classname,
      });
    }

    return autotestData;
  }

  private isMetadataAttachment(attachment: ResultAttachment): boolean {
    return (
      attachment.contentType === "application/vnd.tms.metadata+json" ||
      attachment.name === "tms-metadata.json"
    );
  }

  /** Playwright copies inline attach to disk — reporter often gets path only, not body. */
  private readAttachmentBuffer(attachment: ResultAttachment): Buffer | undefined {
    if (attachment.body) {
      return attachment.body;
    }
    if (!attachment.path) {
      return undefined;
    }
    try {
      return Utils.readBufferSync(attachment.path);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        return undefined;
      }
      throw err;
    }
  }

  /** Each testit.*() call may add a separate tms-metadata.json; merge all of them. */
  private applyMetadataAttachments(autotestData: MetadataMessage, attachments: Result["attachments"]): void {
    let merged: MetadataMessage = {};
    for (const attachment of attachments) {
      if (!this.isMetadataAttachment(attachment)) {
        continue;
      }
      const body = this.readAttachmentBuffer(attachment);
      if (!body) {
        continue;
      }
      merged = { ...merged, ...JSON.parse(body.toString()) };
    }

    applyMetadataTo(autotestData, merged);
  }

  private async loadTest(test: TestCase, result: Result): Promise<void> {
    logger.debug("[playwright] loadTest", { title: test.title, status: result.status });
    try {
      const autotestData = await this.getAutotestData(test, result);

      const dictionaries = this.getDictionariesByTest(test);
      const pathNamespace = dictionaries.slice(0, -1).join(path.sep);
      const pathClassname = dictionaries[dictionaries.length - 1];
      // Prefer testit.namespace / testit.classname from metadata; file path only when missing.
      if (pathNamespace.length > 0 && autotestData.namespace == null) {
        autotestData.namespace = pathNamespace;
      }
      if (pathClassname?.length && autotestData.classname == null) {
        autotestData.classname = pathClassname;
      }

      const autotest = Converter.convertTestCaseToAutotestPost(autotestData);
      const rawSteps =
        result.steps?.length
          ? result.steps
          : [...this.stepsMap.keys()].filter((step: TestStep) => this.stepsMap.get(step) === test);
      const stepResults = Converter.convertTestStepsToSteps(rawSteps, this.attachmentsMap);

      result.status = getTestStatus(test);

      autotest.steps = Converter.convertTestStepsToShortSteps(rawSteps);

      await this.strategy.loadAutotest(
        autotest,
        Converter.convertStatus(result.status, test.expectedStatus));

      const autotestResult = Converter.convertAutotestPostToAutotestResult(
        autotestData,
        test,
        result);

      autotestResult.stepResults = stepResults;

      await this.strategy.loadTestRun([autotestResult]);
    } finally {
      releaseTestMetadata(this.metadataContext(test));
    }
  }
}

export default TmsReporter;

export * from "./labels";
