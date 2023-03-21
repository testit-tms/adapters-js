import { readFileSync } from 'fs';
import { basename } from 'path';
import https from 'https';

import { 
  AttachmentPutModel,
  AutoTestModelV2GetModel,
  AutoTestPostModel,
  AutoTestPutModel,
  AutoTestResultsForTestRunModel,
  AttachmentsApi,
  AutoTestsApi,
  TestRunsApi,
  AttachmentsApiApiKeys,
  AutoTestsApiApiKeys,
  TestRunsApiApiKeys,
  TestRunV2GetModel,
  AutotestFilterModel,
  AutotestsSelectModel,
  RequestDetailedFile,
  TestRunState,
  SearchAutoTestsQueryIncludesModel
} from 'testit-api-client';
import { Logger } from '../common/classes/logger.class';
import { Origin } from '../types/origin.type';
import { HttpClientErrors } from './http-client.errors';


export class DefaultHttpClient {
  private readonly attachmentsApi: AttachmentsApi;
  private readonly autoTestsApi: AutoTestsApi;
  private readonly testRunsApi: TestRunsApi;
  private readonly options;

  constructor(
    public readonly config: Origin.Config,
    private readonly logger: Logger
  ) {
    if (!this.config) {
      HttpClientErrors.throwNotFoundHttpClientConfig();
    }

    try {
      this.attachmentsApi = new AttachmentsApi(config.url);
      this.attachmentsApi.setApiKey(AttachmentsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);
      this.autoTestsApi = new AutoTestsApi(config.url);
      this.autoTestsApi.setApiKey(AutoTestsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);
      this.testRunsApi = new TestRunsApi(config.url);
      this.testRunsApi.setApiKey(TestRunsApiApiKeys['Bearer or PrivateToken'], `PrivateToken ${config.privateToken}`);
    } catch (e) {
      this.logger.warn(e);
    }

    this.options = {
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.certValidation,
      }),
    };
}

  public hasInSystem(id: string): Promise<AutoTestModelV2GetModel | null> {
    return this.autoTestsApi.getAllAutoTests(this.config.projectId, id, this.options)
      .then(response => response.body[0]);
  }

  public create(test: AutoTestPostModel): Promise<AutoTestModelV2GetModel | void> {
    return this.autoTestsApi.createAutoTest(test, this.options)
      .then(response => response.body)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwErrorAfterTestCreate(test);
      });
  }

  public loadAttachment(path: string): Promise<AttachmentPutModel | void> {
    const file: RequestDetailedFile = {
      value: readFileSync(path),
      options: {
        filename: basename(path)
      }
    };

    return this.attachmentsApi.apiV2AttachmentsPost(file, this.options)
      .then(response => response.body)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwNotUploadAttachments(path);
      });
  }

  public update(test: AutoTestPutModel): Promise<AutoTestModelV2GetModel> {
    return this.autoTestsApi.updateAutoTest(test, this.options)
      .then(response => response.body)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwErrorAfterTestUpdate(test);
      });
  }

  public async updateRuns(result: AutoTestResultsForTestRunModel, run = this.config.testRunId) {
    await this.testRunsApi.setAutoTestResultsForTestRun(run, [result], this.options);
  }

  public async updateManyRuns(result: AutoTestResultsForTestRunModel[], run = this.config.testRunId) {
    await this.testRunsApi.setAutoTestResultsForTestRun(run, result, this.options);
  }
  public async createEmptyRun(name = '') {
    return this.testRunsApi
      .createEmpty({ name, projectId: this.config.projectId }, this.options)
      .then(response => response.body)
      .catch((error) => this.logger.error(error));
  }

  public async linkToWorkItem(autotestId: string, ids: string[]) {
    for (const id of ids) {
      try {
        await this.autoTestsApi.linkAutoTestToWorkItem(autotestId, { id }, this.options);

        this.logger.log(`Test - ${autotestId} linked with WI - ${ids}`);
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  public async startRunIfNeeded(id: string) {
    try {
      const run = await this.getRun(id);

      if (run.stateName === TestRunState.NotStarted) {
        await this.testRunsApi.startTestRun(id, this.options);

        this.logger.log(`Test run  - ${run.id} started`);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async completeRunIfNeeded(id: string) {
    try {
      const run = await this.getRun(id);

      if (run.stateName === TestRunState.InProgress) {
        await this.testRunsApi.completeTestRun(id, this.options);

        this.logger.log(`Test run - ${run.id} completed`);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  public getRun(id: string): Promise<TestRunV2GetModel> {
    return this.testRunsApi.getTestRunById(id, this.options)
    .then(response => response.body);
  }

  public async getTestsIdsByRunId(id: string): Promise<string[]> {
    const run = await this.getRun(id);
    
    return run.testResults
      .filter(test => test.configurationId === this.config.configurationId)
      .map(test => test.autoTest.externalId);
  }
}
