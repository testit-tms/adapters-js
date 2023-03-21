import { readFileSync } from 'fs';
import { basename } from 'path';
import https from 'https';
import {
  AutoTestPostModel,
  AutoTestResultsForTestRunModel,
  AttachmentsApi,
  AutoTestsApi,
  TestRunsApi,
  AttachmentsApiApiKeys,
  AutoTestsApiApiKeys,
  TestRunsApiApiKeys,
  HttpError,
  RequestDetailedFile,
  TestRunState
} from 'testit-api-client';
import { debug } from './debug';
import { Config } from './types';
import { formatError } from './utils';

const log = debug.extend('client');

export class TestClient {
  constructor(config: Partial<Config>) {
    this.attachmentsApi = new AttachmentsApi(config.url);
    this.attachmentsApi.setApiKey(AttachmentsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);
    this.autoTestsApi = new AutoTestsApi(config.url);
    this.autoTestsApi.setApiKey(AutoTestsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);
    this.testRunsApi = new TestRunsApi(config.url);
    this.testRunsApi.setApiKey(TestRunsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);

    this.options = {
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.certValidation,
      }),
    };
    this.config = config;
  }

  private readonly attachmentsApi: AttachmentsApi;
  private readonly autoTestsApi: AutoTestsApi;
  private readonly testRunsApi: TestRunsApi;
  private readonly config: Partial<Config>;
  private readonly options;

  get testRunId(): string {
    if (this.config.testRunId === undefined) {
      throw new Error('Test run id is not set');
    }
    return this.config.testRunId;
  }

  get projectId(): string {
    if (this.config.projectId === undefined) {
      throw new Error('Project id is not set');
    }
    return this.config.projectId;
  }

  get configurationId(): string {
    if (this.config.configurationId === undefined) {
      throw new Error('Configuration id is not set');
    }
    return this.config.configurationId;
  }

  async createTestRun() {
    const { testRunId } = this.config;
    if (testRunId === undefined) {
      log(
        'Test run id is not provided, creating test run for project %s',
        this.projectId
      );
      this.config.testRunId = await this.testRunsApi
        .createEmpty({ projectId: this.projectId }, this.options)
        .then((testRun) => testRun.body.id);
    } else {
      log('Using provided test run id %s', this.testRunId);
    }
    log('Starting test run %s', this.testRunId);
    return this.testRunId;
  }

  async startTestRun() {
    log('Starting test run %s', this.testRunId);
    if (this.testRunId) {
      await this.testRunsApi.startTestRun(this.testRunId, this.options);
      await this.testRunsApi.startTestRun(this.testRunId, this.options);
    }
  }

  async completeTestRun() {
    log('Completing test run %s', this.testRunId);
    const testRun = await this.testRunsApi.getTestRunById(this.testRunId, this.options)
      .then((response) => response.body);
    if (testRun.stateName === TestRunState.InProgress) {
      await this.testRunsApi.completeTestRun(this.testRunId, this.options);
    }
  }

  async loadAutotest(autotestPost: AutoTestPostModel) {
    try {
      log('Creating autotest %o', autotestPost);
      const id = await this.autoTestsApi.createAutoTest(autotestPost, this.options)
        .then((response) => response.body.id);
      return id;
    } catch (err) {
      const error = err as HttpError;
      if (error.response?.statusCode === 409) {
        log(
          'Autotest %s already exists, updating with %o',
          autotestPost.externalId,
          autotestPost
        );
        const autotest = await this.autoTestsApi.getAllAutoTests(
          this.projectId,
          autotestPost.externalId,
          this.options)
          .then((response) => response.body[0]);
        await this.autoTestsApi.updateAutoTest({
          ...autotest,
          links: autotest.links,
        }, this.options
        );
        return autotest.id;
      } else {
        console.error(formatError(err as HttpError));
        throw err;
      }
    }
  }

  async loadPassedAutotest(autotestPost: AutoTestPostModel) {
    try {
      log('Creating autotest %o', autotestPost);
      await this.autoTestsApi.createAutoTest(autotestPost, this.options);
    } catch (err) {
      const error = err as HttpError;
      if (error.response?.statusCode === 409) {
        log(
          'Autotest %s already exists, updating with %o',
          autotestPost.externalId,
          autotestPost
        );
        await this.autoTestsApi.updateAutoTest(autotestPost, this.options);
      } else {
        console.error(formatError(err as HttpError));
        throw err;
      }
    }
  }

  async linkWorkItem(externalId: string, workItemId: string) {
    log('Linking work item %s to autotest %s', workItemId, externalId);
    return this.autoTestsApi.linkAutoTestToWorkItem(externalId, { id: workItemId }, this.options);
  }

  async loadAutotestResults(results: AutoTestResultsForTestRunModel[]) {
    log('Loading autotest results %o', results);
    await this.testRunsApi.setAutoTestResultsForTestRun(this.testRunId, results, this.options);
  }

  async uploadAttachments(paths: string[]): Promise<string[]> {
    const attachmentIds: string[] = [];
    for (const path of paths) {
      try {
        const file: RequestDetailedFile = {
          value: readFileSync(path),
          options: {
            filename: basename(path)
          }
        };
    
        const id = await this.attachmentsApi.apiV2AttachmentsPost(file, this.options)
          .then((response) => {return response.body.id});

        log('Uploaded attachment %s', path);
        if (!id) {
          log('Attachment id is not returned');
          continue;
        }
        attachmentIds.push(id);
      } catch (err) {
        console.error(`Failed to load attachment`, formatError(err as HttpError));
      }
    }
    return attachmentIds;
  }
}
