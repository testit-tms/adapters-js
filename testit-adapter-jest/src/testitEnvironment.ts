import type {
  EnvironmentContext,
  JestEnvironmentConfig,
} from '@jest/environment';
import { Event, State } from 'jest-circus';
import NodeEnvironment from 'jest-environment-node';
import {
  AutotestPost,
  AutotestResultsForTestRun,
  LinkPost,
} from 'testit-api-client';
import { debug } from './debug';
import {
  mapAttachments,
  mapDate,
  mapParams,
  mapStep,
  mapStepResult,
} from './mappers';
import { TestClient } from './testClient';
import { AutotestData, AutotestResult, StepData } from './types';
import {
  createTempDir,
  createTempFile,
  excludePath,
  formatError,
  generateFileName,
  getDir,
  getFileName,
  getHash,
  isDefined,
  removeTempDir,
} from './utils';

const log = debug.extend('environment');

const emptyTitle = '__EMPTY__';
const emptyAutotestData = (): AutotestData => ({
  name: emptyTitle,
  steps: [],
  afterEach: [],
  beforeEach: [],
  attachments: [],
  links: [],
  runtimeLinks: [],
  labels: [],
  workItems: [],
});
const emptyStepData = (): StepData => ({
  title: emptyTitle,
  attachments: [],
});

export default class TestItEnvironment extends NodeEnvironment {
  private autotestData: AutotestData = emptyAutotestData();
  private currentStepData: StepData = emptyStepData();
  private testClient: TestClient;
  private beforeAllSteps: StepData[] = [];
  private afterAllSteps: StepData[] = [];
  private currentType:
    | 'beforeAll'
    | 'afterAll'
    | 'beforeEach'
    | 'afterEach'
    | 'test'
    | 'step'
    | undefined;
  private autotestResults: AutotestResult[] = [];
  private autotests: AutotestData[] = [];
  private testPath: string;
  private attachmentsQueue: Promise<void>[] = [];
  private automaticCreationTestCases: boolean;

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    const testRunId = config.projectConfig.globals['testRunId'];
    const automaticCreationTestCases = config.projectConfig.globals['automaticCreationTestCases'];
    if (!testRunId || typeof testRunId !== 'string') {
      throw new Error('Looks like globalSetup was not called');
    }
    if (!automaticCreationTestCases || typeof automaticCreationTestCases !== 'boolean') {
      throw new Error('Looks like globalSetup was not called');
    }
    this.automaticCreationTestCases = automaticCreationTestCases;
    this.testClient = new TestClient({
      ...config.projectConfig.testEnvironmentOptions,
      testRunId,
    });
    this.testPath = excludePath(context.testPath, config.globalConfig.rootDir);
  }

  async setup() {
    await super.setup();
    createTempDir();
    this.global.testit = {
      externalId: this.setExternalId.bind(this),
      displayName: this.setDisplayName.bind(this),
      links: this.setAutotestLinks.bind(this),
      labels: this.setLabels.bind(this),
      workItemIds: this.setWorkItems.bind(this),
      params: this.setParams.bind(this),
      step: this.startStep.bind(this),
      title: this.setTitle.bind(this),
      description: this.setDescription.bind(this),
      addAttachments: this.addAttachments.bind(this),
      addLinks: this.addLinks.bind(this),
      addMessage: this.addMessage.bind(this),
    };
  }

  async teardown() {
    await super.teardown();
    removeTempDir();
  }

  getVmContext() {
    return super.getVmContext();
  }

  exportConditions() {
    return super.exportConditions();
  }

  async handleTestEvent(event: Event, state: State) {
    switch (event.name) {
      case 'hook_start': {
        this.startHookCapture(event.hook);
        break;
      }
      case 'hook_success':
      case 'hook_failure': {
        this.finishHookCapture(event.hook);
        break;
      }
      case 'test_fn_start': {
        this.startTestCapture(event.test);
        break;
      }
      case 'test_fn_success':
      case 'test_fn_failure': {
        this.finishTestCapture(event.test);
        break;
      }
      case 'test_done': {
        this.saveResult(event.test);
        break;
      }
      case 'test_skip': {
        this.resetTest();
        break;
      }
      case 'run_finish': {
        await this.loadResults();
        break;
      }
    }
  }

  startHookCapture(hook: Extract<Event, { name: 'hook_start' }>['hook']) {
    log('Starting hook capture %s', hook.type);
    this.currentType = hook.type;
    // Use the hook type as the step name
    this.currentStepData.title = hook.type;
  }

  finishHookCapture(hook: Extract<Event, { name: 'hook_start' }>['hook']) {
    log('Finishing hook capture %s', hook.type);
    switch (hook.type) {
      case 'beforeAll': {
        this.beforeAllSteps.push(this.currentStepData);
        break;
      }
      case 'afterAll': {
        this.afterAllSteps.push(this.currentStepData);
        break;
      }
      case 'beforeEach': {
        this.autotestData.beforeEach.push(this.currentStepData);
        break;
      }
      case 'afterEach': {
        this.autotestData.afterEach.push(this.currentStepData);
        break;
      }
    }
    this.resetStep();
  }

  startTestCapture(test: Extract<Event, { name: 'test_fn_start' }>['test']) {
    log('Starting test capture %s', test.name);
    this.currentType = 'test';
    this.setDisplayName(test.name);
  }

  finishTestCapture(test: Extract<Event, { name: 'test_fn_success' }>['test']) {
    log('Finishing test capture %s', test.name);
    if (this.currentStepData.title !== emptyTitle) {
      this.autotestData.steps.push(this.currentStepData);
      this.resetStep();
    }
    this.currentType = undefined;
  }

  saveResult(test: Extract<Event, { name: 'test_done' }>['test']) {
    log('Saving result for %s', test.name);
    const errorMessage =
      test.errors.length > 0
        ? test.errors.map((err) => err[0]?.message).join('\n')
        : undefined;
    const errorTraces =
      test.errors.length > 0
        ? test.errors.map((err) => err[0]?.stack).join('\n')
        : undefined;

    const result: AutotestResult = {
      isFailed: test.errors.length > 0,
      startedAt: test.startedAt ?? undefined,
      duration: test.duration ?? undefined,
      finishedAt:
        test.startedAt && isDefined(test.duration)
          ? test.startedAt + test.duration
          : undefined,
      message: errorMessage,
      trace: errorTraces,
    };

    this.autotests.push(this.autotestData);
    this.autotestResults.push(result);
    this.resetTest();
  }

  async loadResults() {
    log('Waiting for attachments to be uploaded');
    await Promise.all(this.attachmentsQueue);

    const results: AutotestResultsForTestRun[] = [];
    for (let i = 0; i < this.autotests.length; i++) {
      const autotest = this.autotests[i];
      const result = this.autotestResults[i];
      log('Mapping autotest %s', autotest.name);

      const setupSteps = this.beforeAllSteps.concat(autotest.beforeEach);
      const teardownSteps = autotest.afterEach.concat(this.afterAllSteps);

      const autotestPost: AutotestPost = {
        projectId: this.testClient.projectId,
        externalId:
          autotest.externalId ?? this.generateExternalId(autotest.name),
        title: autotest.title,
        name: autotest.name,
        description: autotest.description,
        namespace: getDir(this.testPath),
        classname: getFileName(this.testPath),
        setup: setupSteps.map(mapStep),
        steps: autotest.steps.map(mapStep),
        teardown: teardownSteps.map(mapStep),
        links: autotest.links,
        labels: autotest.labels.map((label) => ({ name: label })),
        shouldCreateWorkItem: this.automaticCreationTestCases,
      };

      if (!result.isFailed) {
        await this.testClient.loadPassedAutotest(autotestPost);
      } else {
        await this.testClient.loadAutotest(autotestPost);
      }

      if (autotest.workItems.length > 0) {
        const id = await this.testClient.getAutotestId(autotestPost.externalId);
        try {
          await Promise.all(
            autotest.workItems.map((workItem) => {
              return this.testClient.linkWorkItem(id, workItem);
            })
          );
        } catch (err) {
          console.error('Failed to link work items', formatError(err));
        }
      }

      const messages = [];

      if (autotest.message) {
        messages.push(autotest.message);
      }

      if (result.message) {
        messages.push(result.message);
      }

      results.push({
        autotestExternalId: autotestPost.externalId,
        configurationId: this.testClient.configurationId,
        outcome: result.isFailed ? 'Failed' : 'Passed',
        startedOn: result.startedAt ? mapDate(result.startedAt) : undefined,
        duration: result.duration ? result.duration : undefined,
        completedOn: result.finishedAt ? mapDate(result.finishedAt) : undefined,
        attachments: mapAttachments(autotest.attachments),
        message: messages.length > 0 ? messages.join('\n') : undefined,
        traces: result.trace,
        stepResults: autotest.steps.map(mapStepResult),
        setupResults: setupSteps.map(mapStepResult),
        teardownResults: teardownSteps.map(mapStepResult),
        links: autotest.runtimeLinks,
        parameters:
          autotest.params !== undefined
            ? mapParams(autotest.params)
            : undefined,
      });
    }
    log('Loading results');
    await this.testClient.loadAutotestResults(results);
  }

  resetTest() {
    this.autotestData = emptyAutotestData();
    this.currentType = undefined;
  }

  resetStep() {
    this.currentStepData = emptyStepData();
  }

  setExternalId(id: string): void {
    log('Setting external id to %s', id);
    this.autotestData.externalId = id;
  }

  setDisplayName(name: string): void {
    log('Setting display name to %s', name);
    this.autotestData.name = name;
  }

  setTitle(title: string) {
    if (this.currentType === 'test') {
      log('Setting autotest title to %s', title);
      this.autotestData.title = title;
    } else {
      log('Setting step title to %s', title);
      this.currentStepData.title = title;
    }
  }

  setDescription(description: string) {
    if (this.currentType === 'test') {
      log('Setting autotest description to %s', description);
      this.autotestData.description = description;
    } else {
      log('Setting step description to %s', description);
      this.currentStepData.description = description;
    }
  }

  addAttachments(attachment: string, name?: string): void;
  addAttachments(attachments: string[]): void;
  addAttachments(attachments: string[] | string, name?: string) {
    const autotest = this.autotestData;
    const step = this.currentStepData;
    let target: string[];
    if (this.currentType === 'test') {
      log('Adding attachments to %s', autotest.name);
      target = autotest.attachments;
    } else {
      log('Adding attachments to %s', step.title);
      target = step.attachments;
    }
    let files: string[];
    if (Array.isArray(attachments)) {
      files = attachments;
    } else {
      if (!name) {
        name = generateFileName();
      }
      const path = createTempFile(name, attachments);
      files = [path];
    }
    const promise = this.testClient.uploadAttachments(files).then((ids) => {
      target.push(...ids);
    });
    this.attachmentsQueue.push(promise);
    return promise;
  }

  addLinks(links: LinkPost[]) {
    log('Adding links to %s', this.autotestData.name);
    this.autotestData.runtimeLinks.push(...links);
  }

  addMessage(message: string) {
    log('Adding message to %s', this.autotestData.name);
    this.autotestData.message = message;
  }

  setAutotestLinks(links: LinkPost[]) {
    log('Setting autotest links to %s', this.autotestData.name);
    this.autotestData.links = links;
  }

  setLabels(labels: string[]) {
    log('Setting labels to %s', this.autotestData.name);
    this.autotestData.labels = labels;
  }

  setWorkItems(workItems: string[]) {
    log('Setting work items to %s', this.autotestData.name);
    this.autotestData.workItems = workItems;
  }

  setParams(params: any) {
    log('Setting params to %s', this.autotestData.name);
    this.autotestData.params = params;
  }

  startStep(name: string, description?: string) {
    log('Starting step %s', name);
    if (this.currentType !== 'test' && this.currentType !== 'step') {
      log('Step can only be started in test');
      return;
    }
    if (this.currentType === 'step') {
      this.autotestData.steps.push(this.currentStepData);
      this.resetStep();
    }
    this.currentType = 'step';
    this.currentStepData.title = name;
    this.currentStepData.description = description;
  }

  generateExternalId(testName: string) {
    return getHash(
      JSON.stringify({
        path: this.testPath,
        name: testName,
      })
    );
  }
}
