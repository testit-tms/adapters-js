import type { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import { Event } from "jest-circus";
import NodeEnvironment from "jest-environment-node";
import { Attachment, AutotestPost, AutotestResult, Link, Step, Additions, ConfigComposer, Utils, StrategyFactory, IStrategy } from "testit-js-commons";
import { debug } from "debug";
import { AutotestData } from "./types";
import { excludePath, mapParams } from "./utils";
import { logger } from "testit-js-commons";


const log = debug("tms").extend("environment");

const emptyAutotestData = (): AutotestData => ({
  externalId: "",
  name: "",
  steps: [],
  afterEach: [],
  testSteps: [],
  beforeEach: [],
  attachments: [],
  links: [],
  labels: [],
  tags: [],
});

const emptyStepData = (): Step => ({
  title: "",
  attachments: [],
});

type RealtimeSentSnapshot = {
  autotest: AutotestData;
  result: AutotestResult;
};

export default class TestItEnvironment extends NodeEnvironment {
  private autotestData: AutotestData = emptyAutotestData();
  private currentStepData: Step = emptyStepData();

  private beforeAllSteps: Step[] = [];
  private afterAllSteps: Step[] = [];

  private currentType: "beforeAll" | "afterAll" | "beforeEach" | "afterEach" | "test" | "step" | undefined;

  private autotestResults: AutotestResult[] = [];
  private autotests: AutotestData[] = [];
  private readonly testPath: string;
  private attachmentsQueue: Promise<Attachment[]>[] = [];

  private readonly strategy: IStrategy;
  private readonly additions: Additions;
  private readonly usesGlobalStrategy: boolean;
  private readonly unhandledRejectionHandler: (reason: unknown) => void;
  private finalized = false;
  private readonly importRealtime: boolean;
  private currentTestAttachmentsQueue: Promise<Attachment[]>[] = [];
  /** Sent in realtime on test_done; finalized with afterAll on run_finish. */
  private realtimeSent: RealtimeSentSnapshot[] = [];

  constructor(jestConfig: JestEnvironmentConfig, jestContext: EnvironmentContext) {
    super(jestConfig, jestContext);
    const config = new ConfigComposer().compose(jestConfig.projectConfig.testEnvironmentOptions);
    this.importRealtime = Boolean(config.importRealtime);

    this.additions = new Additions(config);
    this.usesGlobalStrategy = Boolean(globalThis.strategy);
    this.strategy = globalThis.strategy ?? StrategyFactory.create(config);
    this.unhandledRejectionHandler = (reason: unknown) => {
      logger.error("Unhandled promise rejection in Jest environment:", this.formatError(reason));
    };

    this.testPath = excludePath(jestContext.testPath, jestConfig.globalConfig.rootDir);
  }

  async setup() {
    // Register as early as possible for this worker process.
    process.on("unhandledRejection", this.unhandledRejectionHandler);
    await super.setup();
    const testRunId = await this.strategy.testRunId;
    const syncRunner = (this.strategy as any).syncStorageRunner;
    logger.debug("[jest-env] setup start", {
      pid: process.pid,
      testRunId,
      importRealtime: this.importRealtime,
      usesGlobalStrategy: this.usesGlobalStrategy,
      syncRunnerActive: Boolean(syncRunner?.isActive?.()),
      syncRunnerMaster: Boolean(syncRunner?.isMasterWorker?.()),
    });
    // Jest workers run in separate processes and do not share globalThis.strategy from globalSetup.
    // For those workers, run setup locally to register in sync storage (master will publish in-progress).
    if (!this.usesGlobalStrategy) {
      try {
        await this.strategy.setup();
        const localSyncRunner = (this.strategy as any).syncStorageRunner;
        logger.debug("[jest-env] local setup done", {
          pid: process.pid,
          testRunId,
          syncRunnerActive: Boolean(localSyncRunner?.isActive?.()),
          syncRunnerMaster: Boolean(localSyncRunner?.isMasterWorker?.()),
        });
      } catch (err: any) {
        logger.error("Failed local strategy.setup() in Jest environment:", this.formatError(err));
      }
    } else {
      const sharedSyncRunner = (this.strategy as any).syncStorageRunner;
      logger.debug("[jest-env] shared strategy mode", {
        pid: process.pid,
        testRunId,
        syncRunnerActive: Boolean(sharedSyncRunner?.isActive?.()),
        syncRunnerMaster: Boolean(sharedSyncRunner?.isMasterWorker?.()),
      });
    }
    this.global.testit = {
      externalId: this.setExternalId.bind(this),
      displayName: this.setDisplayName.bind(this),
      links: this.setLinks.bind(this),
      labels: this.setLabels.bind(this),
      tags: this.setTags.bind(this),
      workItemIds: this.setWorkItems.bind(this),
      params: this.setParams.bind(this),
      step: this.startStep.bind(this),
      title: this.setTitle.bind(this),
      description: this.setDescription.bind(this),
      addAttachments: this.addAttachments.bind(this),
      addLinks: this.additions.addLinks.bind(this.additions),
      addMessage: this.additions.addMessage.bind(this.additions),
      namespace: this.setNameSpace.bind(this),
      classname: this.setClassName.bind(this),
    };
  }

  async teardown() {
    process.off("unhandledRejection", this.unhandledRejectionHandler);
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }

  exportConditions() {
    return super.exportConditions();
  }

  async handleTestEvent(event: Event) {
    try {
      switch (event.name) {
        case "hook_start": {
          this.startHookCapture(event.hook);
          break;
        }
        case "hook_success":
        case "hook_failure": {
          this.finishHookCapture(event.hook);
          break;
        }
        case "test_fn_start": {
          this.startTestCapture(event.test);
          break;
        }
        case "test_fn_success":
        case "test_fn_failure": {
          this.finishTestCapture(event.test);
          break;
        }
        case "test_done": {
          await this.saveResult(event.test);
          break;
        }
        case "test_skip": {
          this.resetTest();
          break;
        }
        case "run_finish": {
          logger.debug("[jest-env] run_finish", {
            importRealtime: this.importRealtime,
            realtimeSent: this.realtimeSent.length,
            afterAllSteps: this.afterAllSteps.length,
          });
          try {
            await this.flushRealtimeTeardown();
            await this.loadResults();
          } catch (err: any) {
            logger.error("Failed to load results in Jest run_finish:", this.formatError(err));
          } finally {
            // In worker mode we run local setup, so finalization must happen here even if loadResults fails.
            if (!this.finalized) {
              this.finalized = true;
              try {
                await this.strategy.teardown();
              } catch (err: any) {
                logger.error("Failed strategy.teardown() in Jest run_finish:", this.formatError(err));
              }
            }
          }
          break;
        }
      }
    } catch (err: any) {
      logger.error("Unhandled async error in Jest environment event handler:", this.formatError(err));
    }
  }

  private formatError(err: any): unknown {
    return err?.body ?? err?.error ?? err;
  }

  startHookCapture(hook: Extract<Event, { name: "hook_start" }>["hook"]) {
    log("Starting hook capture %s", hook.type);
    this.currentType = hook.type;
    // Use the hook type as the step name
    this.currentStepData.title = hook.type;
    this.currentStepData.startedOn = new Date();
  }

  finishHookCapture(hook: Extract<Event, { name: "hook_start" }>["hook"]) {
    log("Finishing hook capture %s", hook.type);

    this.currentStepData.completedOn = new Date();
    this.currentStepData.duration =
      this.currentStepData.completedOn.getTime() - (this.currentStepData.startedOn as Date).getTime();

    switch (hook.type) {
      case "beforeAll": {
        this.beforeAllSteps.push(this.currentStepData);
        break;
      }
      case "afterAll": {
        this.afterAllSteps.push(this.currentStepData);
        break;
      }
      case "beforeEach": {
        this.autotestData.beforeEach.push(this.currentStepData);
        break;
      }
      case "afterEach": {
        this.autotestData.afterEach.push(this.currentStepData);
        break;
      }
    }
    this.resetStep();
  }

  startTestCapture(test: Extract<Event, { name: "test_fn_start" }>["test"]) {
    log("Starting test capture %s", test.name);
    this.currentType = "test";
    this.setDisplayName(test.name);
    this.setExternalId(this.generateExternalId(test.name));
    this.setExternalKey(test.name);
  }

  finishTestCapture(test: Extract<Event, { name: "test_fn_success" }>["test"]) {
    log("Finishing test capture %s", test.name);
    if (this.currentStepData.title !== "") {
      this.autotestData.testSteps.push(this.currentStepData);
      this.resetStep();
    }
    this.currentType = undefined;
  }

  async saveResult(test: Extract<Event, { name: "test_done" }>["test"]) {
    log("Saving result for %s", test.name);

    await Promise.allSettled(this.currentTestAttachmentsQueue);

    const autotestSnapshot = this.snapshotAutotestData();
    const errorMessage = test.errors.length > 0 ? test.errors.map((err) => err[0]?.message).join("\n") : undefined;
    const errorTraces = test.errors.length > 0 ? test.errors.map((err) => err[0]?.stack).join("\n") : undefined;

    const result: AutotestResult = {
      autoTestExternalId: autotestSnapshot.externalId,
      outcome: test.errors.length > 0 ? "Failed" : "Passed",
      startedOn: test.startedAt ? new Date(test.startedAt) : undefined,
      duration: test.duration ?? undefined,
      traces: errorTraces,
      attachments: this.additions.attachments,
      message: this.additions.messages.join("\n").concat(errorMessage ?? ""),
      links: this.additions.links,
    };

    if (this.importRealtime) {
      this.realtimeSent.push({ autotest: autotestSnapshot, result });
      logger.debug("[jest-env] realtime test_done", {
        externalId: autotestSnapshot.externalId,
        outcome: result.outcome,
        afterEachSteps: autotestSnapshot.afterEach.length,
        afterAllStepsKnown: this.afterAllSteps.length,
      });
      try {
        await this.sendRealtimePayload(autotestSnapshot, result, false);
      } catch (err: any) {
        logger.error("Failed realtime send in Jest environment:", this.formatError(err));
      }
    } else {
      this.autotests.push(autotestSnapshot);
      this.autotestResults.push(result);
    }
    this.currentTestAttachmentsQueue = [];
    this.resetTest();
  }

  private snapshotAutotestData(): AutotestData {
    return {
      ...this.autotestData,
      beforeEach: [...this.autotestData.beforeEach],
      afterEach: [...this.autotestData.afterEach],
      testSteps: [...this.autotestData.testSteps],
      attachments: [...this.autotestData.attachments],
      links: this.autotestData.links ? [...this.autotestData.links] : [],
      labels: this.autotestData.labels ? [...this.autotestData.labels] : [],
      tags: this.autotestData.tags ? [...this.autotestData.tags] : [],
    };
  }

  private buildSetupSteps(autotest: AutotestData): Step[] {
    return this.beforeAllSteps.concat(autotest.beforeEach);
  }

  private buildTeardownSteps(autotest: AutotestData, includeAfterAll: boolean): Step[] {
    const afterEach = autotest.afterEach;
    return includeAfterAll ? afterEach.concat(this.afterAllSteps) : afterEach;
  }

  private async sendRealtimePayload(
    autotest: AutotestData,
    result: AutotestResult,
    includeAfterAll: boolean,
  ): Promise<void> {
    const setupSteps = this.buildSetupSteps(autotest);
    const teardownSteps = this.buildTeardownSteps(autotest, includeAfterAll);
    logger.debug("[jest-env] sendRealtimePayload", {
      externalId: autotest.externalId,
      outcome: result.outcome,
      includeAfterAll,
      setupSteps: setupSteps.length,
      teardownSteps: teardownSteps.length,
      testSteps: autotest.testSteps.length,
    });
    const autotestPost: AutotestPost = {
      externalId: autotest.externalId,
      title: autotest.title,
      name: autotest.name,
      description: autotest.description,
      links: autotest.links,
      labels: autotest.labels,
      tags: autotest.tags,
      namespace: autotest.namespace ?? Utils.getDir(this.testPath),
      classname: autotest.classname ?? Utils.getFileName(this.testPath),
      setup: setupSteps,
      steps: autotest.testSteps,
      teardown: teardownSteps,
      externalKey: autotest.externalKey,
    };

    await this.strategy.loadAutotest(autotestPost, result.outcome);
    await this.strategy.loadTestRun([
      {
        autoTestExternalId: autotestPost.externalId,
        outcome: result.outcome,
        startedOn: result.startedOn,
        duration: result.duration,
        attachments: result.attachments,
        message: result.message,
        links: result.links,
        stepResults: autotest.testSteps,
        traces: result.traces,
        setupResults: setupSteps,
        teardownResults: teardownSteps,
        parameters: autotest.parameters !== undefined ? mapParams(autotest.parameters) : undefined,
      },
    ]);
  }

  /** afterAll hooks run after all tests; patch teardown when importRealtime is enabled. */
  private async flushRealtimeTeardown(): Promise<void> {
    if (!this.importRealtime || this.realtimeSent.length === 0 || this.afterAllSteps.length === 0) {
      logger.debug("[jest-env] flushRealtimeTeardown skip", {
        importRealtime: this.importRealtime,
        realtimeSent: this.realtimeSent.length,
        afterAllSteps: this.afterAllSteps.length,
      });
      return;
    }
    logger.debug("[jest-env] flushRealtimeTeardown", {
      tests: this.realtimeSent.length,
      afterAllSteps: this.afterAllSteps.length,
    });
    for (const { autotest, result } of this.realtimeSent) {
      try {
        await this.sendRealtimePayload(autotest, result, true);
      } catch (err: any) {
        logger.error("Failed realtime teardown flush in Jest environment:", this.formatError(err));
      }
    }
  }

  async loadResults() {
    if (this.importRealtime) {
      logger.debug("[jest-env] loadResults skip (importRealtime)");
      return;
    }
    logger.debug("[jest-env] loadResults batch", { tests: this.autotests.length });
    log("Waiting for attachments to be uploaded");
    await Promise.allSettled(this.attachmentsQueue);

    const results: AutotestResult[] = [];
    for (let i = 0; i < this.autotests.length; i++) {
      const autotest = this.autotests[i];
      const result = this.autotestResults[i];
      log("Mapping autotest %s", autotest.name);

      const setupSteps = this.beforeAllSteps.concat(autotest.beforeEach);
      const teardownSteps = autotest.afterEach.concat(this.afterAllSteps);

      const autotestPost: AutotestPost = {
        externalId: autotest.externalId,
        title: autotest.title,
        name: autotest.name,
        description: autotest.description,
        links: autotest.links,
        labels: autotest.labels,
        tags: autotest.tags,
        namespace: autotest.namespace ?? Utils.getDir(this.testPath),
        classname: autotest.classname ?? Utils.getFileName(this.testPath),
        setup: setupSteps,
        steps: autotest.testSteps,
        teardown: teardownSteps,
        externalKey: autotest.externalKey,
      };

      try {
        await this.strategy.loadAutotest(autotestPost, result.outcome);
      } catch (err: any) {
        logger.error("Failed to load autotest in Jest environment:", this.formatError(err));
      }

      results.push({
        autoTestExternalId: autotestPost.externalId,
        outcome: result.outcome,
        startedOn: result.startedOn,
        duration: result.duration,
        attachments: result.attachments,
        message: result.message,
        links: result.links,
        stepResults: autotest.testSteps,
        traces: result.traces,
        setupResults: setupSteps,
        teardownResults: teardownSteps,
        parameters: autotest.parameters !== undefined ? mapParams(autotest.parameters) : undefined,
      });
    }
    log("Loading results");

    try {
      await this.strategy.loadTestRun(results);
    } catch (err: any) {
      logger.error("Failed to load test run in Jest environment:", this.formatError(err));
    }
  }

  resetTest() {
    this.autotestData = emptyAutotestData();
    this.additions.clear();
    this.currentType = undefined;
  }

  resetStep() {
    this.currentStepData = emptyStepData();
  }

  setExternalId(id: string): void {
    log("Setting external id to %s", id);
    this.autotestData.externalId = id;
  }

  setDisplayName(name: string): void {
    log("Setting display name to %s", name);
    this.autotestData.name = name;
  }

  setTitle(title: string) {
    if (this.currentType === "test") {
      log("Setting autotest title to %s", title);
      this.autotestData.title = title;
    } else {
      log("Setting step title to %s", title);
      this.currentStepData.title = title;
    }
  }

  setDescription(description: string) {
    if (this.currentType === "test") {
      log("Setting autotest description to %s", description);
      this.autotestData.description = description;
    } else {
      log("Setting step description to %s", description);
      this.currentStepData.description = description;
    }
  }

  addAttachments(attachment: string, name?: string): void;
  addAttachments(attachments: string[]): void;
  addAttachments(attachments: string[] | string, name?: string) {
    const autotest = this.autotestData;
    const step = this.currentStepData;
    const currentType = this.currentType;

    // @ts-ignore — overload: paths[] | text content + fileName
    const promise = this.additions.addAttachments(attachments, name)
      .then((ids) => {
        currentType === "test" ? autotest.attachments.push(...ids) : step.attachments?.push(...ids);
        return ids;
      })
      .catch((err: any) => {
        logger.log("Error uploading attachment (Jest). \n", err?.body ?? err?.error ?? err);
        return [] as Attachment[];
      });

    this.attachmentsQueue.push(promise);
    this.currentTestAttachmentsQueue.push(promise);
    return promise;
  }

  setLinks(links: Link[]) {
    log("Setting autotest links to %s", this.autotestData.name);
    this.autotestData.links = links;
  }

  setLabels(labels: string[]) {
    log("Setting labels to %s", this.autotestData.name);
    this.autotestData.labels = labels.map((label) => ({ name: label }));
  }

  setTags(tags: string[]) {
    log("Setting tags to %s", this.autotestData.name);
    this.autotestData.tags = tags;
  }

  setWorkItems(workItems: string[]) {
    log("Setting work items to %s", this.autotestData.name);
    this.autotestData.workItemIds = workItems;
  }

  setParams(params: any) {
    log("Setting params to %s", this.autotestData.name);
    this.autotestData.parameters = params;
  }

  setNameSpace(nameSpace: string) {
    log("Setting nameSpace to %s", nameSpace);
    this.autotestData.namespace = nameSpace;
  }

  setClassName(className: string) {
    log("Setting className to %s", className);
    this.autotestData.classname = className;
  }

  setExternalKey(externalKey: string) {
    log("Setting externalKey to %s", externalKey);
    this.autotestData.externalKey = externalKey;
  }

  startStep(name: string, description?: string) {
    log("Starting step %s", name);
    if (this.currentType !== "test" && this.currentType !== "step") {
      log("Step can only be started in test");
      return;
    }
    if (this.currentType === "step") {
      this.autotestData.testSteps.push(this.currentStepData);
      this.resetStep();
    }
    this.currentType = "step";
    this.currentStepData.title = name;
    this.currentStepData.description = description;
  }

  generateExternalId(testName: string) {
    return Utils.getHash(
      JSON.stringify({
        path: this.testPath,
        name: testName,
      })
    );
  }
}
