import type { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import { Event } from "jest-circus";
import NodeEnvironment from "jest-environment-node";
import { AutotestPost, AutotestResult, Link, Step, Additions, Client, ConfigComposer, Utils } from "testit-js-commons";
import { debug } from "debug";
import { AutotestData } from "./types";
import { excludePath, mapParams } from "./utils";

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
});

const emptyStepData = (): Step => ({
  title: "",
  attachments: [],
});

export default class TestItEnvironment extends NodeEnvironment {
  private autotestData: AutotestData = emptyAutotestData();
  private currentStepData: Step = emptyStepData();

  private beforeAllSteps: Step[] = [];
  private afterAllSteps: Step[] = [];

  private currentType: "beforeAll" | "afterAll" | "beforeEach" | "afterEach" | "test" | "step" | undefined;

  private autotestResults: AutotestResult[] = [];
  private autotests: AutotestData[] = [];
  private readonly testPath: string;
  private attachmentsQueue: Promise<void>[] = [];

  private readonly client: Client;
  private readonly additions: Additions;

  constructor(jestConfig: JestEnvironmentConfig, jestContext: EnvironmentContext) {
    super(jestConfig, jestContext);
    const config = new ConfigComposer().compose(jestConfig.projectConfig.testEnvironmentOptions);

    const testRunId = jestConfig.projectConfig.globals["testRunId"];

    if (!testRunId || typeof testRunId !== "string") {
      throw new Error("Looks like globalSetup was not called");
    }

    this.client = new Client({ ...config, testRunId });
    this.additions = new Additions(this.client);

    this.testPath = excludePath(jestContext.testPath, jestConfig.globalConfig.rootDir);
  }

  async setup() {
    await super.setup();
    this.global.testit = {
      externalId: this.setExternalId.bind(this),
      displayName: this.setDisplayName.bind(this),
      links: this.setLinks.bind(this),
      labels: this.setLabels.bind(this),
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
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }

  exportConditions() {
    return super.exportConditions();
  }

  async handleTestEvent(event: Event) {
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
        await this.loadResults();
        break;
      }
    }
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

    await Promise.all(this.attachmentsQueue);

    const errorMessage = test.errors.length > 0 ? test.errors.map((err) => err[0]?.message).join("\n") : undefined;

    const errorTraces = test.errors.length > 0 ? test.errors.map((err) => err[0]?.stack).join("\n") : undefined;

    const result: AutotestResult = {
      autoTestExternalId: this.autotestData.externalId,
      outcome: test.errors.length > 0 ? "Failed" : "Passed",
      startedOn: test.startedAt ? new Date(test.startedAt) : undefined,
      duration: test.duration ?? undefined,
      traces: errorTraces,
      attachments: this.additions.attachments,
      message: this.additions.messages.join("\n").concat(errorMessage ?? ""),
      links: this.additions.links,
    };

    this.autotests.push(this.autotestData);
    this.autotestResults.push(result);
    this.resetTest();
  }

  async loadResults() {
    log("Waiting for attachments to be uploaded");
    await Promise.all(this.attachmentsQueue);

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
        namespace: autotest.namespace ?? Utils.getDir(this.testPath),
        classname: autotest.classname ?? Utils.getFileName(this.testPath),
        setup: setupSteps,
        steps: autotest.testSteps,
        teardown: teardownSteps,
        shouldCreateWorkItem: this.client.getConfig().automaticCreationTestCases,
      };

      await this.client.autoTests.loadAutotest(autotestPost, result.outcome === "Passed");

      if (Array.isArray(autotest.workItemIds) && autotest.workItemIds.length > 0) {
        await this.client.autoTests
          .linkToWorkItems(autotest.externalId, autotest.workItemIds)
          .catch((err) => console.error("Failed to link work items.", err));
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

    const testRunId = this.client.getConfig().testRunId;

    await this.client.testRuns.loadAutotests(testRunId, results);
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

    // @ts-ignore
    const promise = this.additions.addAttachments(attachments, name).then((ids) => {
      currentType === "test" ? autotest.attachments.push(...ids) : step.attachments?.push(...ids);
    });

    this.attachmentsQueue.push(promise);
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
