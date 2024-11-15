import { reporters, Runner } from "mocha";
import deasyncPromise from 'deasync-promise';
import {
  Additions,
  Attachment,
  AutotestPost,
  AutotestResult,
  ConfigComposer,
  IAdditions,
  Link,
  Step,
  Utils,
  IStrategy,
  StrategyFactory,
  Outcome,
} from "testit-js-commons";
import { ReporterOptions, Context, Test, Hook } from "./types";
import { ITestStep, TestStep } from "./step";
import { extractHooks, resolveParallelModeSetupFile } from "./utils";

const Reporter = reporters.Base;
const Events = Runner.constants;

const emptyTest = (): AutotestResult => ({
  autoTestExternalId: "",
  outcome: "Passed",
  stepResults: [],
  setupResults: [],
  teardownResults: [],
  attachments: [],
});

const emptyStep = (): Step => ({
  title: "",
  steps: [],
  attachments: [],
});

const StateConstants = {
  STATE_FAILED: 'failed',
  STATE_PASSED: 'passed',
  STATE_PENDING: 'pending',
}

export class TmsReporter extends Reporter {
  private readonly strategy: IStrategy;
  private readonly additions: IAdditions;

  private attachmentsQueue: Promise<Attachment[]>[] = [];
  private autotestsQueue: Promise<any>[] = [];
  private autotestsForTestRun: AutotestResult[] = [];

  private currentType?: "test" | "step";

  private currentTest: AutotestResult = emptyTest();
  private currentStep: Step = emptyStep();

  constructor(runner: Runner, options: ReporterOptions) {
    super(runner, options);

    const config = new ConfigComposer().compose(options?.tmsOptions);

    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);

    if (options.parallel) {
      options.require = [...(options.require ?? []), resolveParallelModeSetupFile()];
    } else {
      this.applyListeners();
    }
  }

  private applyListeners = () => {
    this.runner.on(Events.EVENT_RUN_BEGIN, () => this.onStartRun());
    this.runner.on(Events.EVENT_RUN_END, () => this.onEndRun());

    this.runner.on(Events.EVENT_TEST_BEGIN, (test: Test) => this.addMethods(test.ctx));
    this.runner.on(Events.EVENT_HOOK_BEGIN, (hook: Hook) => this.addMethods(hook.ctx));

    this.runner.on(Events.EVENT_TEST_BEGIN, () => this.onStartTest());
    this.runner.on(Events.EVENT_TEST_END, (test) => this.onEndTest(test));
  };

  onStartRun = () => {
    this.strategy.setup();
  };

  onEndRun = () => {
    deasyncPromise(this.teardown());
  };

  private async teardown(): Promise<void> {
    await Promise.all(this.attachmentsQueue).catch((err) => {
      console.log("Error loading attachments. \n", err.body);
    });

    await Promise.all(this.autotestsQueue);

    await this.strategy.loadTestRun(this.autotestsForTestRun).catch((err) => {
      console.log("Error load test run. \n", err.body);
    });

    await this.strategy.teardown();
  }

  clearContext(ctx: Context) {
    ctx.externalId = undefined;
    ctx.displayName = undefined;
    ctx.title = undefined;
    ctx.description = undefined;
    ctx.links = [];
    ctx.labels = [];
    ctx.classname = undefined;
    ctx.workItemsIds = [];
    ctx.parameters = {};
    ctx.properties = {};
  }

  addMethods(context?: Context) {
    if (!context) return;

    context.addAttachments = this.addAttachments;
    context.addLinks = this.addLinks;
    context.addMessage = this.addMessage;
    context.addSteps = this.addSteps;
  }

  onStartTest() {
    this.currentType = "test";
    this.currentTest.startedOn = new Date();
  }

  onEndTest(test: Test) {
    const hooks = extractHooks(test.parent);

    const setup = [...hooks.beforeAll, ...hooks.beforeEach];
    const teardown = [...hooks.afterEach, ...hooks.afterAll];

    const autotestPost: AutotestPost = {
      externalId: test.ctx?.externalId ?? Utils.getHash(test.title),
      name: test.ctx?.displayName ?? test.title,
      description: test.ctx?.description,
      title: test.ctx?.title,
      links: test.ctx?.links,
      labels: test.ctx?.labels?.map((label) => ({ name: label })),
      namespace: test.ctx?.namespace ?? this._getNameSpace(test.file),
      classname: test.ctx?.classname ?? this._getClassName(test.file),
      steps: this.currentTest.stepResults,
      setup,
      teardown,
      workItemIds: test.ctx?.workItemsIds,
    };

    const promise = this.strategy.loadAutotest(
      autotestPost,
      test.state == StateConstants.STATE_PASSED);
    this.autotestsQueue.push(promise);

    this.autotestsForTestRun.push({
      autoTestExternalId: autotestPost.externalId,
      outcome: this._getOutcome(test.state),
      startedOn: this.currentTest.startedOn,
      completedOn: new Date(),
      duration: this._getDuration(test.duration),
      stepResults: this.currentTest.stepResults,
      setupResults: setup,
      teardownResults: teardown,
      attachments: this.currentTest.attachments,
      links: this.additions.links,
      message: test.err?.message
        ? this.additions.messages.concat(test.err.message).join("\n")
        : this.additions.messages.join("\n"),
      traces: test.err?.stack,
      parameters: test.ctx?.parameters,
      properties: test.ctx?.properties,
    });

    this.resetTest(test);
  }

  resetTest(test: Test) {
    this.currentTest = emptyTest();
    this.additions.clear();

    if (test.ctx) this.clearContext(test.ctx);
  }

  addAttachments = (pathsOrContent: string | string[], fileName?: string) => {
    const target = this.currentType === "test" ? this.currentTest : this.currentStep;

    const promise: Promise<Attachment[]> =
      typeof pathsOrContent === "string"
        ? this.additions.addAttachments(pathsOrContent, fileName)
        : this.additions.addAttachments(pathsOrContent);

    promise.then((attachments) => {
      target.attachments?.push(...attachments);
    });

    this.attachmentsQueue.push(promise);

    return promise;
  };

  addLinks = (links: Link | Link[]) => {
    Array.isArray(links) ? this.additions.addLinks(links) : this.additions.addLinks(links);
  };

  addMessage = (message: string) => {
    this.additions.addMessage(message);
  };

  addSteps = (title: string, stepConstructor?: (step: ITestStep) => void) => {
    const start = new Date();

    const prevType = this.currentType;
    this.currentType = "step";

    const step = new TestStep(title);

    try {
      stepConstructor?.(step);
      this.currentStep.outcome = "Passed";
    } catch (err) {
      this.currentStep.outcome = "Failed";
      this.currentTest.outcome = "Failed";
      console.log("Step failed. \n", err);
    }

    this.currentStep.title = step.title;
    this.currentStep.description = step.description;
    this.currentStep.parameters = step.parameters;
    this.currentStep.startedOn = start;
    this.currentStep.completedOn = new Date();
    this.currentStep.duration = Date.now() - start.getTime();

    this.currentTest.stepResults?.push(this.currentStep);

    this.currentType = prevType;
    this.currentStep = emptyStep();
  };

  private _getNameSpace(path?: string): string | undefined {
    return path && Utils.getDir(path.replace(__dirname, ""));
  }

  private _getClassName(path?: string): string | undefined {
    return path && Utils.getFileName(path);
  }

  private _getOutcome(state: string | undefined): Outcome {
      switch(state){
        case StateConstants.STATE_FAILED:
          return "Failed";
        case StateConstants.STATE_PENDING:
          return "Skipped";
        default:
          return this.currentTest.outcome;
      }
  }

  private _getDuration(duration: number | undefined): number {
    return duration ?? this.currentTest.startedOn
      ? Date.now() - (this.currentTest.startedOn as Date).getTime()
      : 0;
  }
};
